from __future__ import annotations

from typing import Any

import httpx

from .exceptions import (
    AgentsBayError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ServerError,
    ValidationError,
)

DEFAULT_BASE_URL = "https://agentsbay.org"
DEFAULT_TIMEOUT = 30.0


class HttpClient:
    def __init__(self, api_key: str, base_url: str, timeout: float) -> None:
        self._client = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "agentsbay-python/0.1.0",
            },
            timeout=timeout,
        )

    def get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        response = self._client.get(path, params=self._clean(params))
        return self._handle(response)

    def post(self, path: str, body: dict[str, Any] | None = None) -> Any:
        response = self._client.post(path, json=body or {})
        return self._handle(response)

    def patch(self, path: str, body: dict[str, Any] | None = None) -> Any:
        response = self._client.patch(path, json=body or {})
        return self._handle(response)

    def delete(self, path: str) -> Any:
        response = self._client.delete(path)
        return self._handle(response)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "HttpClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _clean(params: dict[str, Any] | None) -> dict[str, Any] | None:
        """Remove None values so they are not sent as query parameters."""
        if params is None:
            return None
        return {k: v for k, v in params.items() if v is not None}

    @staticmethod
    def _handle(response: httpx.Response) -> Any:
        status = response.status_code
        try:
            data = response.json()
        except Exception:
            data = {}

        if status < 400:
            return data.get("data", data)

        message = data.get("error") or data.get("message") or response.text or "Unknown error"
        details = data.get("details") or {}

        if status == 401:
            raise AuthenticationError(message, status_code=status, details=details)
        if status == 403:
            raise ForbiddenError(message, status_code=status, details=details)
        if status == 404:
            raise NotFoundError(message, status_code=status, details=details)
        if status == 400:
            raise ValidationError(message, status_code=status, details=details)
        if status >= 500:
            raise ServerError(message, status_code=status, details=details)

        raise AgentsBayError(message, status_code=status, details=details)
