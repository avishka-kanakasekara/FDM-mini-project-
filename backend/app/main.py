"""BankReach API. The saved joblib pipeline is the only prediction engine."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.errors import register_exception_handlers
from app.api.routes import auth, health, model, prediction
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.services.auth_service import AuthService
from app.services.model_service import BankReachModelService


def create_app(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        model_service = BankReachModelService(
            active_settings.resolved_model_path,
            active_settings.resolved_metadata_path,
        )
        model_service.load()
        auth_service = AuthService(active_settings.resolved_database_path)
        auth_service.initialize()
        app.state.model_service = model_service
        app.state.auth_service = auth_service
        yield

    app = FastAPI(
        title="BankReach API",
        version="1.0.0",
        summary="Term-deposit subscription decision support.",
        description=(
            "Scores one customer at a time with the saved BankReach logistic-regression pipeline. "
            "The API accepts the 19 raw campaign inputs. Feature engineering, encoding, imputation, "
            "and scaling happen inside the serialized pipeline. Call duration is not an input."
        ),
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Health", "description": "Service availability."},
            {"name": "Account", "description": "Sign up, sign in, and the current session."},
            {"name": "Prediction", "description": "Single-customer subscription assessment."},
            {"name": "Model", "description": "Evaluation metadata for the loaded model."},
        ],
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type"],
    )
    register_exception_handlers(app)
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(model.router, prefix="/api/v1")
    app.include_router(prediction.router, prefix="/api/v1")

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {
            "service": "BankReach",
            "health": "/api/v1/health",
            "docs": "/docs",
        }

    return app


app = create_app()
