"""Shared API client. The real artifact is loaded once for the test session."""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture(scope="session")
def client() -> TestClient:
    database = Path(tempfile.mkdtemp()) / "auth.sqlite"
    application = create_app(Settings(database_path=database))
    with TestClient(application) as test_client:
        created = test_client.post(
            "/api/v1/auth/signup",
            json={"name": "Campaign Officer", "email": "officer@bankreach.test", "password": "campaign-desk"},
        )
        assert created.status_code == 200
        test_client.headers["Authorization"] = f"Bearer {created.json()['token']}"
        yield test_client
