from __future__ import annotations


class AgentsBayError(Exception):
    """Base exception for all AgentsBay SDK errors."""

    def __init__(self, message: str, status_code: int | None = None, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.message!r}, status_code={self.status_code})"


class AuthenticationError(AgentsBayError):
    """Raised when the API key is missing or invalid (401)."""


class ForbiddenError(AgentsBayError):
    """Raised when the caller lacks permission (403)."""


class NotFoundError(AgentsBayError):
    """Raised when a requested resource does not exist (404)."""


class ValidationError(AgentsBayError):
    """Raised when request data fails server-side validation (400)."""


class ServerError(AgentsBayError):
    """Raised on unexpected server errors (5xx)."""
