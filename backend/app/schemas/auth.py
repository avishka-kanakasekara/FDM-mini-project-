"""Sign-up and sign-in contracts."""

from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SignUpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., examples=["Ayesha Perera"])
    email: str = Field(..., examples=["ayesha@bank.example"])
    password: str = Field(..., examples=["a-long-password"])

    @field_validator("name")
    @classmethod
    def _name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Enter your name.")
        if len(cleaned) > 80:
            raise ValueError("Name must be 80 characters or fewer.")
        return cleaned

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not _EMAIL.fullmatch(cleaned):
            raise ValueError("Enter a valid email address.")
        return cleaned

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        if len(value) > 128:
            raise ValueError("Password must be at most 128 characters.")
        return value


class SignInRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not _EMAIL.fullmatch(cleaned):
            raise ValueError("Enter a valid email address.")
        return cleaned

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        if not value:
            raise ValueError("Enter your password.")
        return value


class AccountResponse(BaseModel):
    id: str
    name: str
    email: str


class AuthResponse(BaseModel):
    user: AccountResponse
    token: str
