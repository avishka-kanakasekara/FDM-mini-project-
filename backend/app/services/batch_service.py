"""Score every customer in an uploaded campaign file.

The saved pipeline still receives only the 19 raw columns. Call duration and
any recorded subscription outcome are removed before scoring.
"""

from __future__ import annotations

import io
import logging
import math

import pandas as pd
from pydantic import ValidationError

from app.api.errors import validation_message
from app.core.exceptions import CampaignFileError
from app.domain.options import EXPECTED_INPUT_COLUMNS
from app.schemas.batch import BatchGroup, BatchInvalidRow, BatchRecord, BatchScoreResponse, BatchSummary
from app.schemas.prediction import PredictionRequest
from app.services.model_service import BankReachModelService
from app.services.prediction_service import DISCLAIMER, classify_probability

logger = logging.getLogger(__name__)

MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_DATA_ROWS = 50_000
MAX_INVALID_DETAILS = 100

INTEGER_COLUMNS = {"age", "campaign", "pdays", "previous"}
FLOAT_COLUMNS = {"emp.var.rate", "cons.price.idx", "cons.conf.idx", "euribor3m", "nr.employed"}
DROPPED_WITHOUT_SCORING = {"duration", "y"}

CONTACT_FIRST_GUIDANCE = (
    "Call these customers before the rest of the file. "
    "Each estimate is at or above the model's outreach line."
)
CONTACT_LATER_GUIDANCE = (
    "Keep these customers for a later pass. "
    "A lower priority is not a refusal and does not mean the customer will not subscribe."
)


def _separator(header: str) -> str:
    return ";" if header.count(";") >= header.count(",") else ","


def _coerce(column: str, value: object) -> object | None:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    text = str(value).strip()
    if text == "" or text.lower() == "nan":
        return None
    if column in INTEGER_COLUMNS:
        try:
            number = float(text)
        except ValueError:
            return text
        if not math.isfinite(number) or not number.is_integer():
            return text
        return int(number)
    if column in FLOAT_COLUMNS:
        try:
            number = float(text)
        except ValueError:
            return text
        if not math.isfinite(number):
            return text
        return number
    return text


def _average(probabilities: list[float]) -> float | None:
    if not probabilities:
        return None
    return round(sum(probabilities) / len(probabilities), 6)


def _group(
    decision: str,
    label: str,
    decision_label: str,
    guidance: str,
    probabilities: list[float],
    scored: int,
) -> BatchGroup:
    count = len(probabilities)
    return BatchGroup(
        decision=decision,  # type: ignore[arg-type]
        label=label,
        decision_label=decision_label,
        count=count,
        share=round(count / scored, 4) if scored else 0.0,
        average_probability=_average(probabilities),
        guidance=guidance,
    )


class BatchPredictionService:
    def __init__(self, model_service: BankReachModelService) -> None:
        self._model_service = model_service

    def score_csv(self, raw: bytes) -> BatchScoreResponse:
        frame, ignored = self._read_frame(raw)
        valid_rows: list[tuple[int, dict[str, object]]] = []
        invalid: list[BatchInvalidRow] = []

        for index, row in frame.iterrows():
            row_number = int(index) + 2
            payload: dict[str, object] = {}
            for column in EXPECTED_INPUT_COLUMNS:
                coerced = _coerce(column, row[column])
                if coerced is not None:
                    payload[column] = coerced
            try:
                parsed = PredictionRequest.model_validate(payload)
            except ValidationError as exc:
                errors = exc.errors()
                message = validation_message(errors[0]) if errors else "This row could not be validated."
                invalid.append(BatchInvalidRow(row_number=row_number, message=message))
                continue
            valid_rows.append((row_number, parsed.model_dump(by_alias=True)))

        records = self._score_valid_rows(valid_rows)
        priority = [record.probability for record in records if record.above_threshold]
        later = [record.probability for record in records if not record.above_threshold]
        scored = len(records)
        logger.info(
            "Scored campaign file rows=%d scored=%d invalid=%d priority=%d",
            len(frame),
            scored,
            len(invalid),
            len(priority),
        )
        return BatchScoreResponse(
            summary=BatchSummary(
                file_rows=len(frame),
                scored_rows=scored,
                invalid_rows=len(invalid),
                invalid_details_truncated=len(invalid) > MAX_INVALID_DETAILS,
                threshold=self._model_service.decision_threshold,
                model_name=self._model_service.model_name,
                average_probability=_average([record.probability for record in records]),
                groups=[
                    _group("priority", "Contact first", "Prioritize Outreach", CONTACT_FIRST_GUIDANCE, priority, scored),
                    _group(
                        "lower_priority",
                        "Contact later",
                        "Lower Priority",
                        CONTACT_LATER_GUIDANCE,
                        later,
                        scored,
                    ),
                ],
                ignored_columns=ignored,
                notes=self._notes(ignored),
                disclaimer=DISCLAIMER,
            ),
            records=records,
            invalid=invalid[:MAX_INVALID_DETAILS],
        )

    def _score_valid_rows(self, valid_rows: list[tuple[int, dict[str, object]]]) -> list[BatchRecord]:
        if not valid_rows:
            return []
        frame = pd.DataFrame([payload for _, payload in valid_rows])
        probabilities = self._model_service.predict_probabilities(frame)
        threshold = self._model_service.decision_threshold
        records: list[BatchRecord] = []
        for (row_number, payload), probability in zip(valid_rows, probabilities, strict=True):
            decision, label, above = classify_probability(float(probability), threshold)
            records.append(
                BatchRecord.model_validate(
                    {
                        "row_number": row_number,
                        "probability": round(float(probability), 6),
                        "decision": decision,
                        "decision_label": label,
                        "above_threshold": above,
                        **payload,
                    }
                )
            )
        records.sort(key=lambda record: (-record.probability, record.row_number))
        return records

    def _read_frame(self, raw: bytes) -> tuple[pd.DataFrame, list[str]]:
        if not raw or not raw.strip():
            raise CampaignFileError("The file is empty. Upload a CSV with a header and one row per customer.")
        if len(raw) > MAX_FILE_BYTES:
            raise CampaignFileError("The file is larger than 12 MB. Split it and score each part.")
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise CampaignFileError("The file must be a UTF-8 CSV.") from exc

        lines = text.splitlines()
        header = lines[0] if lines else ""
        try:
            frame = pd.read_csv(io.StringIO(text), sep=_separator(header), dtype=str, skipinitialspace=True)
        except pd.errors.ParserError as exc:
            raise CampaignFileError(
                "The file could not be read as a CSV. Use a header row and one customer per line."
            ) from exc
        if frame.empty and len(frame.columns) == 0:
            raise CampaignFileError("The file is empty. Upload a CSV with a header and one row per customer.")

        frame.columns = [str(column).strip() for column in frame.columns]
        if frame.columns.duplicated().any():
            raise CampaignFileError("The file has a repeated column name. Keep one column for each model input.")

        missing = [column for column in EXPECTED_INPUT_COLUMNS if column not in frame.columns]
        if missing:
            raise CampaignFileError("The file is missing required columns: " + ", ".join(missing) + ".")
        if len(frame) > MAX_DATA_ROWS:
            raise CampaignFileError(
                f"This file has {len(frame)} customer rows. Score at most {MAX_DATA_ROWS:,} rows at a time."
            )

        ignored = [column for column in frame.columns if column not in EXPECTED_INPUT_COLUMNS]
        usable = frame.loc[:, EXPECTED_INPUT_COLUMNS].dropna(how="all")
        if usable.empty:
            raise CampaignFileError("The file has a header but no customer rows.")
        return usable, ignored

    def _notes(self, ignored: list[str]) -> list[str]:
        notes: list[str] = []
        if "duration" in ignored:
            notes.append("Call duration was in the file and was not used. It is only known after the conversation.")
        if "y" in ignored:
            notes.append("The recorded subscription outcome was not used. Each probability comes from the saved model.")
        other = [column for column in ignored if column not in DROPPED_WITHOUT_SCORING]
        if other:
            notes.append("Columns that are not model inputs were left out of the score: " + ", ".join(other) + ".")
        notes.append(
            "Customers at or above the outreach line are the group to call first. The other group waits for a later pass."
        )
        return notes
