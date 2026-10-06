"""Score one customer, or every customer in a campaign file, with the saved pipeline."""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Request

from app.api.deps import get_current_account
from app.schemas.auth import AccountResponse
from app.schemas.batch import BatchScoreResponse
from app.schemas.prediction import EXAMPLE_REQUEST, ErrorResponse, PredictionRequest, PredictionResponse
from app.services.batch_service import BatchPredictionService
from app.services.prediction_service import PredictionService

router = APIRouter(tags=["Prediction"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Estimate term-deposit subscription probability",
    responses={
        401: {"model": ErrorResponse, "description": "Sign in is required."},
        422: {"model": ErrorResponse, "description": "The customer profile failed validation."},
        503: {"model": ErrorResponse, "description": "The saved model could not produce a prediction."},
    },
)
def predict(
    request: Request,
    body: PredictionRequest = Body(
        openapi_examples={
            "campaign_customer": {
                "summary": "Customer profile taken from the campaign dataset",
                "value": EXAMPLE_REQUEST,
            }
        }
    ),
    _account: AccountResponse = Depends(get_current_account),
) -> PredictionResponse:
    service = PredictionService(request.app.state.model_service)
    return service.predict(body)


@router.post(
    "/predict/batch",
    response_model=BatchScoreResponse,
    summary="Score every customer in a campaign CSV",
    responses={
        401: {"model": ErrorResponse, "description": "Sign in is required."},
        422: {"model": ErrorResponse, "description": "The file could not be read or is missing required columns."},
        503: {"model": ErrorResponse, "description": "The saved model could not score the file."},
    },
)
async def predict_batch(
    request: Request,
    _account: AccountResponse = Depends(get_current_account),
) -> BatchScoreResponse:
    raw = await request.body()
    service = BatchPredictionService(request.app.state.model_service)
    return service.score_csv(raw)
