"""Convert framework and domain errors into a stable client payload."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AuthError, CampaignFileError, PredictionUnavailableError

logger = logging.getLogger(__name__)

_RANGE_MESSAGES = {
    "age": "Age must be between 17 and 98.",
    "campaign": "Current campaign contacts must be between 1 and 56.",
    "pdays": "Days since previous contact must be between 0 and 999. Use 999 when there was no previous contact.",
    "previous": "Previous campaign contacts must be between 0 and 7.",
}

_NUMERIC_FIELDS = {
    "age",
    "campaign",
    "pdays",
    "previous",
    "emp.var.rate",
    "cons.price.idx",
    "cons.conf.idx",
    "euribor3m",
    "nr.employed",
}


def _field_name(error: dict) -> str:
    location = [str(part) for part in error.get("loc", []) if part not in {"body", "query", "path"}]
    return location[-1] if location else "request"


def _clean_message(message: str) -> str:
    prefix = "Value error, "
    if message.startswith(prefix):
        return message[len(prefix):]
    return message


def validation_message(error: dict) -> str:
    field = _field_name(error)
    error_type = error.get("type", "")
    raw_message = _clean_message(str(error.get("msg", "The request could not be validated.")))

    if field == "duration":
        return "The field 'duration' is not accepted. Call duration is unknown before outreach and is excluded."
    if error_type == "missing":
        return f"Required field '{field}' is missing."
    if error_type == "extra_forbidden":
        return f"Unexpected field '{field}' is not accepted."
    if error_type in {"greater_than_equal", "less_than_equal", "greater_than", "less_than"}:
        return _RANGE_MESSAGES.get(field, f"{field} is outside the supported range.")
    if error_type in {"int_parsing", "int_from_float", "float_parsing", "finite_number"}:
        if field in _NUMERIC_FIELDS:
            if error_type == "finite_number":
                return f"{field} must be a finite number."
            if error_type in {"int_parsing", "int_from_float"}:
                return _RANGE_MESSAGES.get(field, f"{field} must be a whole number.")
        return f"'{field}' must be a finite number."
    if error_type == "value_error":
        return raw_message
    if raw_message and raw_message != "Field required":
        return raw_message
    return "The request could not be validated."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        message = validation_message(errors[0]) if errors else "The request could not be validated."
        return JSONResponse(status_code=422, content={"error": "validation_error", "message": message})

    @app.exception_handler(AuthError)
    async def handle_auth(_: Request, exc: AuthError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.code, "message": exc.message},
        )

    @app.exception_handler(CampaignFileError)
    async def handle_campaign_file(_: Request, exc: CampaignFileError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"error": "validation_error", "message": exc.message})

    @app.exception_handler(PredictionUnavailableError)
    async def handle_unavailable(_: Request, exc: PredictionUnavailableError) -> JSONResponse:
        logger.error("Prediction unavailable: %s", exc)
        return JSONResponse(
            status_code=503,
            content={
                "error": "model_unavailable",
                "message": "Prediction service is temporarily unavailable.",
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, StarletteHTTPException):
            return await http_exception_handler(request, exc)
        logger.exception("Unhandled API error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_error",
                "message": "The request could not be completed.",
            },
        )
