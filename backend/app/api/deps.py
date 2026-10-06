"""Request dependencies shared by protected routes."""

from __future__ import annotations

from fastapi import Header, Request

from app.core.exceptions import AuthError
from app.schemas.auth import AccountResponse


def bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_current_account(
    request: Request,
    authorization: str | None = Header(default=None),
) -> AccountResponse:
    token = bearer_token(authorization)
    if token is None:
        raise AuthError("Sign in to use BankReach.")
    account = request.app.state.auth_service.account_for_token(token)
    if account is None:
        raise AuthError("Sign in to use BankReach.")
    return AccountResponse(id=account.id, name=account.name, email=account.email)
