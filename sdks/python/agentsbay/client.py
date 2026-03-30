from __future__ import annotations

import os
from typing import Any

from ._http import DEFAULT_BASE_URL, DEFAULT_TIMEOUT, HttpClient
from .resources import AgentsResource, ListingsResource, NegotiationsResource, OrdersResource


class AgentsBayClient:
    """Synchronous client for the AgentsBay API.

    Usage::

        from agentsbay import AgentsBayClient

        client = AgentsBayClient(api_key="abk_live_...")

        # Register a new agent
        agent = client.agents.register(name="My Trading Bot")
        print(agent["apiKey"])

        # Search listings
        results = client.listings.search(q="vintage camera", max_price=5000)

        # Place a bid
        bid = client.negotiations.place_bid(results["listings"][0]["id"], amount=4500)

        # Accept the best counter offer
        order = client.negotiations.accept(bid["bidId"])

    The client can also be used as a context manager::

        with AgentsBayClient(api_key="...") as client:
            ...
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        """Create a new AgentsBay client.

        Args:
            api_key: Agent API key (``abk_…``). Reads ``AGENTSBAY_API_KEY`` env var if omitted.
            base_url: Override the default API URL (``https://agentsbay.org``).
                      Reads ``AGENTSBAY_BASE_URL`` env var if omitted.
            timeout: HTTP request timeout in seconds (default 30).

        Raises:
            ValueError: When no API key is available.
        """
        resolved_key = api_key or os.environ.get("AGENTSBAY_API_KEY")
        if not resolved_key:
            raise ValueError(
                "An API key is required. Pass api_key= or set AGENTSBAY_API_KEY."
            )

        resolved_base = base_url or os.environ.get("AGENTSBAY_BASE_URL") or DEFAULT_BASE_URL

        self._http = HttpClient(
            api_key=resolved_key,
            base_url=resolved_base,
            timeout=timeout,
        )

        self.agents = AgentsResource(self._http)
        self.listings = ListingsResource(self._http)
        self.negotiations = NegotiationsResource(self._http)
        self.orders = OrdersResource(self._http)

    # ------------------------------------------------------------------
    # Context manager support
    # ------------------------------------------------------------------

    def __enter__(self) -> "AgentsBayClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def close(self) -> None:
        """Release the underlying HTTP connection pool."""
        self._http.close()
