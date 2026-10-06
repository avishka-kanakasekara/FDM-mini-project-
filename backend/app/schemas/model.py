"""Public model-information contract. The serialized estimator is never returned."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PermutationSignal(BaseModel):
    feature: str
    importance: float
    std: float


class ModelInfoResponse(BaseModel):
    project: str
    model_name: str
    decision_threshold: float
    primary_metric: str
    threshold_metric: str
    validation_strategy: str
    input_feature_count: int
    input_columns: list[str]
    excluded_leakage_features: list[str]
    test_metrics: dict[str, float]
    validation_metrics: dict[str, float]
    permutation_importance: list[PermutationSignal] = Field(default_factory=list)
    permutation_importance_note: str
    metrics_note: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    decision_threshold: float | None = None
    input_feature_count: int | None = None
