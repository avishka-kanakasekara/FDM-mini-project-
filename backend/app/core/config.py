"""Runtime configuration. Model paths come from the server environment, never from a request."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def resolve_path(path: Path) -> Path:
    if path.is_absolute():
        return path
    return (BACKEND_ROOT / path).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    model_path: Path = Field(
        default=Path("artifacts/bankreach_final_model.joblib"),
        validation_alias="BANKREACH_MODEL_PATH",
    )
    metadata_path: Path = Field(
        default=Path("artifacts/bankreach_model_metadata.json"),
        validation_alias="BANKREACH_METADATA_PATH",
    )
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ORIGINS",
    )
    log_level: str = Field(default="INFO", validation_alias="BANKREACH_LOG_LEVEL")
    database_path: Path = Field(
        default=Path("data/bankreach.sqlite"),
        validation_alias="BANKREACH_DATABASE_PATH",
    )

    @property
    def resolved_model_path(self) -> Path:
        return resolve_path(self.model_path)

    @property
    def resolved_metadata_path(self) -> Path:
        return resolve_path(self.metadata_path)

    @property
    def resolved_database_path(self) -> Path:
        return resolve_path(self.database_path)

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
