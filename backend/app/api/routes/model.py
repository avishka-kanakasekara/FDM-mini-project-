"""Read-only model card assembled from the artifact and metadata file."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from app.api.deps import get_current_account
from app.schemas.auth import AccountResponse
from app.schemas.model import ModelInfoResponse, PermutationSignal

router = APIRouter(tags=["Model"])

METRICS_NOTE = (
    "These figures are evaluation results from the held-out test period and the validation period. "
    "They are not live production performance."
)


@router.get("/model", response_model=ModelInfoResponse, summary="Evaluation metadata for the loaded model")
def model_info(request: Request, _account: AccountResponse = Depends(get_current_account)) -> ModelInfoResponse:
    service = request.app.state.model_service
    metadata = service.metadata()
    importance_block = metadata.get("permutation_importance") or {}
    signals = [
        PermutationSignal.model_validate(item)
        for item in importance_block.get("features", [])
    ]
    note = importance_block.get("caveat") or (
        "These variables showed stronger or weaker predictive contribution in the evaluation analysis. "
        "This is not a causal effect."
    )
    source = importance_block.get("source")
    if source:
        note = f"{note} {source}"

    return ModelInfoResponse(
        project=str(metadata.get("project") or "BankReach — Term-Deposit Subscription Prediction"),
        model_name=service.model_name,
        decision_threshold=service.decision_threshold,
        primary_metric=str(metadata.get("primary_metric") or ""),
        threshold_metric=str(metadata.get("threshold_metric") or ""),
        validation_strategy=str(metadata.get("validation_strategy") or ""),
        input_feature_count=len(service.input_columns),
        input_columns=service.input_columns,
        excluded_leakage_features=list(metadata.get("excluded_leakage_features") or ["duration"]),
        test_metrics={key: float(value) for key, value in metadata.get("test_metrics", {}).items()},
        validation_metrics={
            key: float(value) for key, value in metadata.get("validation_metrics", {}).items()
        },
        permutation_importance=signals,
        permutation_importance_note=note,
        metrics_note=METRICS_NOTE,
    )
