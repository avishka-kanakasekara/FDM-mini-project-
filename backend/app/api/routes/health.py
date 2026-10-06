"""Service health. Status comes from the loaded artifact, not a fixed flag."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.model import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Service and model status")
def health(request: Request) -> HealthResponse:
    return HealthResponse.model_validate(request.app.state.model_service.health())
