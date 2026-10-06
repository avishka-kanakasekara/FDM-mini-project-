"""Prediction contract, validation, and threshold behaviour against the saved pipeline."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

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


def _assert_threshold_decision(body: dict) -> None:
    above = body["probability"] >= body["threshold"]
    assert body["above_threshold"] is above
    if above:
        assert body["decision"] == "priority"
        assert body["decision_label"] == "Prioritize Outreach"
    else:
        assert body["decision"] == "lower_priority"
        assert body["decision_label"] == "Lower Priority"
    assert "will subscribe" not in body["message"].lower()
    assert body["model_name"] == "Logistic Regression"
    assert body["target"] == "Term Deposit Subscription"


TECHNICIAN_EXAMPLE = {
    "age": 35,
    "job": "technician",
    "marital": "single",
    "education": "university.degree",
    "default": "no",
    "housing": "yes",
    "loan": "no",
    "contact": "cellular",
    "month": "may",
    "day_of_week": "mon",
    "campaign": 2,
    "pdays": 999,
    "previous": 0,
    "poutcome": "nonexistent",
    "emp.var.rate": -1.8,
    "cons.price.idx": 92.893,
    "cons.conf.idx": -46.2,
    "euribor3m": 1.313,
    "nr.employed": 5099.1,
}


def test_technician_example_matches_joblib(client: TestClient) -> None:
    from pathlib import Path

    import joblib
    import pandas as pd

    import app.services.model_service  # noqa: F401  binds the notebook transformer for unpickling

    artifact_path = Path(__file__).resolve().parents[1] / "artifacts" / "bankreach_final_model.joblib"
    artifact = joblib.load(artifact_path)
    frame = pd.DataFrame([TECHNICIAN_EXAMPLE])[artifact["input_columns"]]
    direct = float(artifact["model"].predict_proba(frame)[:, 1][0])

    response = client.post("/api/v1/predict", json=TECHNICIAN_EXAMPLE)
    assert response.status_code == 200
    body = response.json()
    assert body["probability"] == pytest.approx(round(direct, 6), abs=1e-6)
    assert body["threshold"] == pytest.approx(artifact["decision_threshold"])
    assert body["model_name"] == "Logistic Regression"
    _assert_threshold_decision(body)


def test_valid_example_uses_saved_pipeline(client: TestClient) -> None:
    response = client.post("/api/v1/predict", json=EXAMPLE_REQUEST)
    assert response.status_code == 200
    body = response.json()
    assert body["probability"] == pytest.approx(0.771695, abs=1e-6)
    assert body["threshold"] == pytest.approx(0.70, abs=1e-6)
    _assert_threshold_decision(body)
    assert body["decision"] == "priority"


def test_first_dataset_row_is_lower_priority(client: TestClient) -> None:
    response = client.post("/api/v1/predict", json=FIRST_DATASET_ROW)
    assert response.status_code == 200
    body = response.json()
    assert body["probability"] == pytest.approx(0.272461, abs=1e-6)
    _assert_threshold_decision(body)
    assert body["decision"] == "lower_priority"


def test_invalid_categorical_is_rejected(client: TestClient) -> None:
    payload = {**EXAMPLE_REQUEST, "job": "ceo"}
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "occupation" in body["message"].lower()


def test_invalid_numeric_is_rejected(client: TestClient) -> None:
    payload = {**EXAMPLE_REQUEST, "age": 0}
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "age" in body["message"].lower()


def test_missing_field_is_rejected(client: TestClient) -> None:
    payload = dict(EXAMPLE_REQUEST)
    payload.pop("job")
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "job" in body["message"]


def test_duration_is_rejected(client: TestClient) -> None:
    payload = {**EXAMPLE_REQUEST, "duration": 180}
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "validation_error"
    assert "duration" in body["message"]


def test_campaign_history_must_agree(client: TestClient) -> None:
    no_history = {**EXAMPLE_REQUEST, "previous": 0, "pdays": 12, "poutcome": "success"}
    response = client.post("/api/v1/predict", json=no_history)
    assert response.status_code == 422
    assert "previous contacts is 0" in response.json()["message"]

    contacted_without_outcome = {**EXAMPLE_REQUEST, "previous": 2, "pdays": 999, "poutcome": "nonexistent"}
    response = client.post("/api/v1/predict", json=contacted_without_outcome)
    assert response.status_code == 422
    assert "failure or success" in response.json()["message"]


def test_previous_contact_with_pdays_999_is_accepted(client: TestClient) -> None:
    payload = {**EXAMPLE_REQUEST, "previous": 2, "pdays": 999, "poutcome": "failure"}
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["probability"] <= 1


def test_non_finite_economic_value_is_rejected(client: TestClient) -> None:
    payload = {**EXAMPLE_REQUEST, "euribor3m": "NaN"}
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["error"] == "validation_error"
