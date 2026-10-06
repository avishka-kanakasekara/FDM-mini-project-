"""Load the notebook deployment artifact once and serve predictions from it."""

from __future__ import annotations

import __main__
import json
import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from app.core.exceptions import ModelArtifactError, PredictionUnavailableError
from app.domain.options import EXPECTED_INPUT_COLUMNS
from app.ml.feature_engineering import BankReachFeatureEngineer

# The notebook defines this class in its own session and pickles it as
# __main__.BankReachFeatureEngineer. Binding that name restores the fitted
# pipeline. It does not refit the model.
__main__.BankReachFeatureEngineer = BankReachFeatureEngineer

logger = logging.getLogger(__name__)

REQUIRED_ARTIFACT_KEYS = ("model", "decision_threshold", "input_columns")
REQUIRED_PIPELINE_STEPS = ("feature_engineering", "preprocessing", "model")


class BankReachModelService:
    """Holds the saved pipeline, its threshold, and the companion metadata."""

    def __init__(self, model_path: Path, metadata_path: Path) -> None:
        self.model_path = model_path
        self.metadata_path = metadata_path
        self._artifact: dict | None = None
        self._metadata: dict | None = None

    def load(self) -> None:
        self._artifact = self._read_artifact()
        self._metadata = self._read_metadata()
        self._validate()
        logger.info(
            "Loaded %s with threshold %.4f and %d input columns from %s",
            self.model_name,
            self.decision_threshold,
            len(self.input_columns),
            self.model_path,
        )

    def predict_probability(self, payload: dict[str, object]) -> float:
        if self._artifact is None:
            raise PredictionUnavailableError("The model artifact is not loaded.")

        frame = pd.DataFrame([payload])
        missing = [column for column in self.input_columns if column not in frame.columns]
        if missing:
            raise PredictionUnavailableError("The request is missing model inputs.")

        ordered = frame.loc[:, self.input_columns]
        try:
            probability = float(self.pipeline.predict_proba(ordered)[:, 1][0])
        except Exception as exc:
            logger.exception("Saved pipeline failed during prediction")
            raise PredictionUnavailableError("The saved pipeline could not score this profile.") from exc

        if not np.isfinite(probability) or not 0.0 <= probability <= 1.0:
            logger.error("Pipeline returned a non-probability value: %s", probability)
            raise PredictionUnavailableError("The saved pipeline returned an invalid probability.")
        return probability

    def predict_probabilities(self, frame: pd.DataFrame) -> np.ndarray:
        """Score many raw profiles in one call through the saved pipeline."""
        if self._artifact is None:
            raise PredictionUnavailableError("The model artifact is not loaded.")
        if frame.empty:
            return np.array([], dtype=float)

        missing = [column for column in self.input_columns if column not in frame.columns]
        if missing:
            raise PredictionUnavailableError("The request is missing model inputs.")

        ordered = frame.loc[:, self.input_columns].copy()
        try:
            probabilities = np.asarray(self.pipeline.predict_proba(ordered)[:, 1], dtype=float)
        except Exception as exc:
            logger.exception("Saved pipeline failed during batch prediction")
            raise PredictionUnavailableError("The saved pipeline could not score this file.") from exc

        if probabilities.shape != (len(ordered),) or not np.isfinite(probabilities).all():
            logger.error("Pipeline returned invalid batch probabilities")
            raise PredictionUnavailableError("The saved pipeline returned an invalid probability.")
        if (probabilities < 0.0).any() or (probabilities > 1.0).any():
            raise PredictionUnavailableError("The saved pipeline returned an invalid probability.")
        return probabilities

    def health(self) -> dict[str, object]:
        loaded = self._artifact is not None
        return {
            "status": "healthy" if loaded else "unavailable",
            "model_loaded": loaded,
            "model_name": self.model_name if loaded else "",
            "decision_threshold": self.decision_threshold if loaded else None,
            "input_feature_count": len(self.input_columns) if loaded else None,
        }

    def metadata(self) -> dict:
        if self._metadata is None or self._artifact is None:
            raise ModelArtifactError("Model metadata is not loaded.")
        return self._metadata

    @property
    def pipeline(self) -> Pipeline:
        if self._artifact is None:
            raise ModelArtifactError("The model artifact is not loaded.")
        return self._artifact["model"]

    @property
    def decision_threshold(self) -> float:
        if self._artifact is None:
            raise ModelArtifactError("The model artifact is not loaded.")
        return float(self._artifact["decision_threshold"])

    @property
    def model_name(self) -> str:
        if self._artifact is None:
            raise ModelArtifactError("The model artifact is not loaded.")
        return str(self._artifact.get("model_name") or "Unknown model")

    @property
    def input_columns(self) -> list[str]:
        if self._artifact is None:
            raise ModelArtifactError("The model artifact is not loaded.")
        return list(self._artifact["input_columns"])

    def _read_artifact(self) -> dict:
        if not self.model_path.is_file():
            raise ModelArtifactError(
                f"Model artifact was not found at {self.model_path}. "
                "Place bankreach_final_model.joblib in backend/artifacts."
            )
        try:
            loaded = joblib.load(self.model_path)
        except Exception as exc:
            logger.exception("Failed to unpickle the model artifact")
            raise ModelArtifactError(
                f"Model artifact at {self.model_path} could not be loaded."
            ) from exc
        if not isinstance(loaded, dict):
            raise ModelArtifactError("Model artifact must be a dictionary produced by the notebook export.")
        return loaded

    def _read_metadata(self) -> dict:
        if not self.metadata_path.is_file():
            raise ModelArtifactError(
                f"Model metadata was not found at {self.metadata_path}. "
                "Place bankreach_model_metadata.json in backend/artifacts."
            )
        try:
            metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ModelArtifactError(f"Model metadata at {self.metadata_path} is not valid JSON.") from exc
        if not isinstance(metadata, dict):
            raise ModelArtifactError("Model metadata must be a JSON object.")
        return metadata

    def _validate(self) -> None:
        assert self._artifact is not None
        assert self._metadata is not None

        missing_keys = [key for key in REQUIRED_ARTIFACT_KEYS if key not in self._artifact]
        if missing_keys:
            raise ModelArtifactError(
                "Model artifact is missing required keys: " + ", ".join(missing_keys) + "."
            )

        pipeline = self._artifact["model"]
        if not isinstance(pipeline, Pipeline):
            raise ModelArtifactError("Artifact model must be the saved scikit-learn pipeline.")

        step_names = set(pipeline.named_steps)
        missing_steps = [step for step in REQUIRED_PIPELINE_STEPS if step not in step_names]
        if missing_steps:
            raise ModelArtifactError(
                "Saved pipeline is missing steps: " + ", ".join(missing_steps) + "."
            )
        if not isinstance(pipeline.named_steps["model"], LogisticRegression):
            raise ModelArtifactError("Saved pipeline model must be the notebook Logistic Regression.")

        threshold = self._artifact["decision_threshold"]
        try:
            threshold_value = float(threshold)
        except (TypeError, ValueError) as exc:
            raise ModelArtifactError("decision_threshold must be a number between 0 and 1.") from exc
        if not 0.0 < threshold_value < 1.0:
            raise ModelArtifactError("decision_threshold must be between 0 and 1.")

        columns = self._artifact["input_columns"]
        if not isinstance(columns, list) or not all(isinstance(column, str) for column in columns):
            raise ModelArtifactError("input_columns must be a list of column names.")
        if "duration" in columns:
            raise ModelArtifactError("input_columns must not include the leakage feature duration.")
        if columns != EXPECTED_INPUT_COLUMNS:
            raise ModelArtifactError(
                "input_columns do not match the 19 raw features expected by the BankReach pipeline."
            )

        for key in ("project", "model_name", "test_metrics", "validation_metrics", "validation_strategy"):
            if key not in self._metadata:
                raise ModelArtifactError(f"Model metadata is missing '{key}'.")

        metadata_threshold = self._metadata.get("decision_threshold")
        if metadata_threshold is not None and abs(float(metadata_threshold) - threshold_value) > 1e-9:
            logger.warning(
                "Metadata threshold %s differs from artifact threshold %s. The artifact threshold will be used.",
                metadata_threshold,
                threshold_value,
            )
