"""Create an account, sign in, and end a session."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request

from app.api.deps import bearer_token, get_current_account
from app.schemas.auth import AccountResponse, AuthResponse, SignInRequest, SignUpRequest
from app.schemas.prediction import ErrorResponse

router = APIRouter(tags=["Account"])


def _auth_response(account, token: str) -> AuthResponse:
    return AuthResponse(user=AccountResponse(id=account.id, name=account.name, email=account.email), token=token)


@router.post(
    "/auth/signup",
    response_model=AuthResponse,
    summary="Create a campaign-desk account",
    responses={
        409: {"model": ErrorResponse, "description": "An account with this email already exists."},
        422: {"model": ErrorResponse, "description": "The name, email, or password is not valid."},
    },
)
def sign_up(body: SignUpRequest, request: Request) -> AuthResponse:
    account, token = request.app.state.auth_service.sign_up(body.name, body.email, body.password)
    return _auth_response(account, token)


@router.post(
    "/auth/signin",
    response_model=AuthResponse,
    summary="Sign in to an existing account",
    responses={401: {"model": ErrorResponse, "description": "The email or password is incorrect."}},
)
def sign_in(body: SignInRequest, request: Request) -> AuthResponse:
    account, token = request.app.state.auth_service.sign_in(body.email, body.password)
    return _auth_response(account, token)


@router.post("/auth/signout", summary="End the current session")
def sign_out(request: Request, authorization: str | None = Header(default=None)) -> dict[str, bool]:
    request.app.state.auth_service.sign_out(bearer_token(authorization))
    return {"signed_out": True}


@router.get(
    "/auth/me",
    response_model=AccountResponse,
    summary="Return the signed-in account",
    responses={401: {"model": ErrorResponse, "description": "No valid session was sent."}},
)
def current_account(account: AccountResponse = Depends(get_current_account)) -> AccountResponse:
    return account
