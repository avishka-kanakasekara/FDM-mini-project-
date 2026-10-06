"""Campaign-file scoring uses the saved pipeline once per file."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.domain.options import EXPECTED_INPUT_COLUMNS
from app.schemas.prediction import EXAMPLE_REQUEST

FIRST_DATASET_ROW = {
    "age": 56,
    "job": "housemaid",
    "marital": "married",
    "education": "basic.4y",
    "default": "no",
    "housing": "no",
    "loan": "no",
    "contact": "telephone",
    "month": "may",
    "day_of_week": "mon",
    "campaign": 1,
    "pdays": 999,
    "previous": 0,
    "poutcome": "nonexistent",
    "emp.var.rate": 1.1,
    "cons.price.idx": 93.994,
    "cons.conf.idx": -36.4,
    "euribor3m": 4.857,
    "nr.employed": 5191.0,
}


def _csv(rows: list[dict], extra_columns: dict[str, str] | None = None) -> str:
    columns = list(EXPECTED_INPUT_COLUMNS)
    if extra_columns:
        columns.extend(extra_columns)
    lines = [";".join(columns)]
    for row in rows:
        values = []
        for column in EXPECTED_INPUT_COLUMNS:
            values.append(str(row[column]))
        if extra_columns:
            values.extend(extra_columns.values())
        lines.append(";".join(values))
    return "\n".join(lines)


def _post(client: TestClient, content: str):
    return client.post(
        "/api/v1/predict/batch",
        content=content.encode("utf-8"),
        headers={"Content-Type": "text/csv"},
    )


def test_batch_scores_known_customers_and_groups_them(client: TestClient) -> None:
    response = _post(client, _csv([EXAMPLE_REQUEST, FIRST_DATASET_ROW]))
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["scored_rows"] == 2
    assert body["summary"]["invalid_rows"] == 0
    assert body["summary"]["model_name"] == "Logistic Regression"
    assert body["summary"]["threshold"] == 0.7000000000000002

    by_row = {record["row_number"]: record for record in body["records"]}
    assert by_row[2]["probability"] == 0.771695
    assert by_row[2]["decision"] == "priority"
    assert by_row[2]["decision_label"] == "Prioritize Outreach"
    assert by_row[3]["probability"] == 0.272461
    assert by_row[3]["decision"] == "lower_priority"
    assert body["records"][0]["probability"] == 0.771695

    groups = {group["decision"]: group for group in body["summary"]["groups"]}
    assert groups["priority"]["label"] == "Contact first"
    assert groups["priority"]["count"] == 1
    assert groups["lower_priority"]["label"] == "Contact later"
    assert groups["lower_priority"]["count"] == 1
    assert "not a refusal" in groups["lower_priority"]["guidance"]
    assert "duration" not in body["records"][0]


def test_duration_and_outcome_columns_are_ignored(client: TestClient) -> None:
    response = _post(client, _csv([EXAMPLE_REQUEST], extra_columns={"duration": "261", "y": "yes"}))
    assert response.status_code == 200
    body = response.json()
    assert body["records"][0]["probability"] == 0.771695
    assert body["summary"]["ignored_columns"] == ["duration", "y"]
    assert any("duration" in note.lower() for note in body["summary"]["notes"])
    assert "will subscribe" not in " ".join(body["summary"]["notes"]).lower()


def test_invalid_row_is_reported_and_valid_row_is_scored(client: TestClient) -> None:
    bad = {**EXAMPLE_REQUEST, "job": "ceo"}
    response = _post(client, _csv([bad, FIRST_DATASET_ROW]))
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["scored_rows"] == 1
    assert body["summary"]["invalid_rows"] == 1
    assert body["invalid"][0]["row_number"] == 2
    assert "occupation" in body["invalid"][0]["message"].lower()
    assert body["records"][0]["probability"] == 0.272461


def test_missing_column_rejects_the_file(client: TestClient) -> None:
    response = _post(client, "age;job\n29;technician\n")
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "missing required columns" in body["message"].lower()


def test_empty_file_is_rejected(client: TestClient) -> None:
    response = _post(client, "   ")
    assert response.status_code == 422
    assert response.json()["error"] == "validation_error"


def test_real_campaign_extract_matches_single_score(client: TestClient) -> None:
    dataset = Path(__file__).resolve().parents[2] / "bank-additional-full.csv"
    lines = dataset.read_text(encoding="utf-8").splitlines()[:4]
    response = _post(client, "\n".join(lines))
    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["file_rows"] == 3
    assert body["summary"]["scored_rows"] == 3
    assert body["summary"]["invalid_rows"] == 0
    assert "duration" in body["summary"]["ignored_columns"]
    first = next(record for record in body["records"] if record["row_number"] == 2)
    assert first["probability"] == 0.272461
    assert first["job"] == "housemaid"
    single = client.post("/api/v1/predict", json=FIRST_DATASET_ROW)
    assert first["probability"] == single.json()["probability"]
