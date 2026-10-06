"""Health and model-information endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_health_reports_loaded_logistic_regression(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["model_loaded"] is True
    assert body["model_name"] == "Logistic Regression"
    assert body["input_feature_count"] == 19
    assert 0 < body["decision_threshold"] < 1
    assert body["decision_threshold"] == pytest.approx(0.70, abs=1e-6)


def test_model_endpoint_returns_notebook_evaluation(client: TestClient) -> None:
    response = client.get("/api/v1/model")
    assert response.status_code == 200
    body = response.json()
    assert body["model_name"] == "Logistic Regression"
    assert body["primary_metric"] == "PR-AUC / Average Precision"
    assert body["threshold_metric"] == "F2"
    assert body["input_feature_count"] == 19
    assert "duration" in body["excluded_leakage_features"]
    assert "duration" not in body["input_columns"]
    assert len(body["input_columns"]) == 19
    assert body["test_metrics"]["PR-AUC"] == pytest.approx(0.5753109292981835)
    assert body["test_metrics"]["ROC-AUC"] == pytest.approx(0.6916874775049143)
    assert body["test_metrics"]["Precision"] == pytest.approx(0.49710815500289185)
    assert body["test_metrics"]["Recall"] == pytest.approx(0.7237894736842105)
    assert body["test_metrics"]["F1"] == pytest.approx(0.5894051088633636)
    assert body["test_metrics"]["F2"] == pytest.approx(0.6632968050625097)
    assert "Chronological 70/15/15" in body["validation_strategy"]
    assert body["decision_threshold"] == pytest.approx(0.7000000000000002)
    assert body["permutation_importance"] == []
    assert "not live production" in body["metrics_note"].lower()
