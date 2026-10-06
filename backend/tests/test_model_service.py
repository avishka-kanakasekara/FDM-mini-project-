"""Startup checks for a missing, corrupt, or inconsistent artifact."""

from __future__ import annotations

from pathlib import Path

import joblib
import pytest

from app.core.exceptions import ModelArtifactError
from app.services.model_service import BankReachModelService
from app.services.prediction_service import build_assessment

ARTIFACT = Path(__file__).resolve().parents[1] / "artifacts" / "bankreach_final_model.joblib"
METADATA = Path(__file__).resolve().parents[1] / "artifacts" / "bankreach_model_metadata.json"


def test_model_service_loads_real_artifact() -> None:
    service = BankReachModelService(ARTIFACT, METADATA)
    service.load()
    assert service.model_name == "Logistic Regression"
    assert service.decision_threshold == pytest.approx(0.70, abs=1e-6)
    assert len(service.input_columns) == 19
    assert "duration" not in service.input_columns
    health = service.health()
    assert health["model_loaded"] is True


def test_missing_artifact_fails_clearly(tmp_path: Path) -> None:
    service = BankReachModelService(tmp_path / "missing.joblib", METADATA)
    with pytest.raises(ModelArtifactError, match="not found"):
        service.load()


def test_missing_metadata_fails_clearly(tmp_path: Path) -> None:
    service = BankReachModelService(ARTIFACT, tmp_path / "missing.json")
    with pytest.raises(ModelArtifactError, match="metadata"):
        service.load()


def test_unloadable_artifact_fails_clearly(tmp_path: Path) -> None:
    broken = tmp_path / "bankreach_final_model.joblib"
    broken.write_text("this is not a joblib file", encoding="utf-8")
    service = BankReachModelService(broken, METADATA)
    with pytest.raises(ModelArtifactError, match="could not be loaded"):
        service.load()


def test_artifact_without_required_keys_fails(tmp_path: Path) -> None:
    incomplete = tmp_path / "model.joblib"
    joblib.dump({"model_name": "Logistic Regression"}, incomplete)
    service = BankReachModelService(incomplete, METADATA)
    with pytest.raises(ModelArtifactError, match="missing required keys"):
        service.load()


def test_threshold_outside_unit_interval_fails(tmp_path: Path) -> None:
    artifact = joblib.load(ARTIFACT)
    artifact["decision_threshold"] = 1.4
    path = tmp_path / "model.joblib"
    joblib.dump(artifact, path)
    service = BankReachModelService(path, METADATA)
    with pytest.raises(ModelArtifactError, match="between 0 and 1"):
        service.load()


def test_duration_column_is_rejected(tmp_path: Path) -> None:
    artifact = joblib.load(ARTIFACT)
    artifact["input_columns"] = ["duration", *artifact["input_columns"][1:]]
    path = tmp_path / "model.joblib"
    joblib.dump(artifact, path)
    service = BankReachModelService(path, METADATA)
    with pytest.raises(ModelArtifactError, match="duration"):
        service.load()


def test_decision_follows_loaded_threshold() -> None:
    service = BankReachModelService(ARTIFACT, METADATA)
    service.load()
    threshold = service.decision_threshold
    above = build_assessment(threshold, threshold, service.model_name)
    below = build_assessment(threshold - 0.001, threshold, service.model_name)
    assert above.decision == "priority"
    assert above.above_threshold is True
    assert below.decision == "lower_priority"
    assert below.above_threshold is False
    assert above.threshold == threshold
