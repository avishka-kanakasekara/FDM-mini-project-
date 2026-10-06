"""Accounts gate the campaign desk. The saved model is unchanged."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.schemas.prediction import EXAMPLE_REQUEST


def test_signup_returns_an_account_and_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/signup",
        json={"name": "  Nimal  Fernando ", "email": "Nimal@Bank.Example", "password": "outreach-list"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["name"] == "Nimal Fernando"
    assert body["user"]["email"] == "nimal@bank.example"
    assert body["token"]
    assert "password" not in body["user"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "nimal@bank.example"


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/signup",
        json={"name": "Campaign Officer", "email": "officer@bankreach.test", "password": "campaign-desk"},
    )
    assert response.status_code == 409
    assert response.json()["error"] == "account_exists"


def test_signin_rejects_a_wrong_password(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/signin",
        json={"email": "officer@bankreach.test", "password": "not-the-password"},
    )
    assert response.status_code == 401
    assert response.json()["message"] == "The email or password is incorrect."


def test_short_password_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/signup",
        json={"name": "Short Password", "email": "short@bankreach.test", "password": "short"},
    )
    assert response.status_code == 422
    assert "8" in response.json()["message"]


def test_prediction_requires_a_session(client: TestClient) -> None:
    response = client.post(
        "/api/v1/predict",
        json=EXAMPLE_REQUEST,
        headers={"Authorization": "Bearer not-a-session"},
    )
    assert response.status_code == 401
    assert response.json()["message"] == "Sign in to use BankReach."


def test_sign_out_ends_the_session(client: TestClient) -> None:
    created = client.post(
        "/api/v1/auth/signup",
        json={"name": "Temporary Officer", "email": "temporary@bankreach.test", "password": "campaign-desk"},
    )
    token = created.json()["token"]
    header = {"Authorization": f"Bearer {token}"}
    assert client.post("/api/v1/auth/signout", headers=header).status_code == 200
    assert client.get("/api/v1/auth/me", headers=header).status_code == 401


def test_signed_in_prediction_still_uses_the_saved_model(client: TestClient) -> None:
    response = client.post("/api/v1/predict", json=EXAMPLE_REQUEST)
    assert response.status_code == 200
    assert response.json()["probability"] == 0.771695
