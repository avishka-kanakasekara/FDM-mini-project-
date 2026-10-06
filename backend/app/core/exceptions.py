"""Errors that are safe to show to an API client."""

from __future__ import annotations


class ModelArtifactError(RuntimeError):
    """The saved model cannot be loaded or does not match the expected contract."""


class PredictionUnavailableError(RuntimeError):
    """A prediction could not be produced from the loaded pipeline."""


class AuthError(Exception):
    """A sign-in, sign-up, or session check failed with a message safe to show."""

    def __init__(self, message: str, status_code: int = 401, code: str = "unauthorized") -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class CampaignFileError(Exception):
    """The uploaded campaign file cannot be scored as a whole."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message
