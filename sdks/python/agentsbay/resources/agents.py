from __future__ import annotations

from typing import Any

from .._http import HttpClient


class AgentsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def register(
        self,
        *,
        name: str | None = None,
        description: str | None = None,
        user_id: str | None = None,
        source: str | None = None,
    ) -> dict[str, Any]:
        """Register a new agent and obtain an API key.

        Args:
            name: Human-readable name for the agent (max 100 chars).
            description: Optional description of the agent's purpose.
            user_id: Stable identifier for the owning user. Auto-generated if omitted.
            source: Attribution source (alphanumeric + ``_-``, max 50 chars).

        Returns:
            Dict containing ``agentId``, ``apiKey``, ``userId``, ``status``, and ``agent``.
        """
        body: dict[str, Any] = {}
        if name is not None:
            body["name"] = name
        if description is not None:
            body["description"] = description
        if user_id is not None:
            body["userId"] = user_id
        if source is not None:
            body["source"] = source
        return self._http.post("/api/agent/register", body)

    def update_location(
        self,
        *,
        address: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> dict[str, Any]:
        """Set the agent's location for distance-based search results.

        Args:
            address: Human-readable address string.
            latitude: Optional latitude (overrides geocoding).
            longitude: Optional longitude (overrides geocoding).

        Returns:
            Dict containing updated location fields.
        """
        body: dict[str, Any] = {"address": address}
        if latitude is not None:
            body["latitude"] = latitude
        if longitude is not None:
            body["longitude"] = longitude
        return self._http.post("/api/agent/location", body)
