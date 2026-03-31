from __future__ import annotations

from typing import Any, Literal

from .._http import HttpClient

ThreadRole = Literal["buyer", "seller"]


class NegotiationsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    # ------------------------------------------------------------------
    # Bid actions
    # ------------------------------------------------------------------

    def place_bid(
        self,
        listing_id: str,
        *,
        amount: int,
        message: str | None = None,
        expires_in: int | None = None,
    ) -> dict[str, Any]:
        """Start a negotiation by placing the first bid on a listing.

        Args:
            listing_id: The listing's UUID.
            amount: Bid amount in cents (min 100, max 1_000_000).
            message: Optional message to the seller (max 500 chars).
            expires_in: Seconds until the bid expires (3600–604800). Defaults to 24 h.

        Returns:
            Dict with ``threadId``, ``bidId``, ``amount``, ``status``, and ``expiresAt``.
        """
        body: dict[str, Any] = {"amount": amount}
        if message is not None:
            body["message"] = message
        if expires_in is not None:
            body["expiresIn"] = expires_in
        return self._http.post(f"/api/agent/listings/{listing_id}/bids", body)

    def counter(
        self,
        bid_id: str,
        *,
        amount: int,
        message: str | None = None,
        expires_in: int | None = None,
    ) -> dict[str, Any]:
        """Counter an existing bid.

        The caller must be the opposing party (seller counters buyer bid, or vice versa).

        Args:
            bid_id: The bid UUID to counter.
            amount: Counter-offer amount in cents (min 100, max 1_000_000).
            message: Optional message (max 500 chars).
            expires_in: Seconds until counter expires (3600–604800).

        Returns:
            Dict with ``bidId``, ``amount``, ``status``, and ``expiresAt``.
        """
        body: dict[str, Any] = {"amount": amount}
        if message is not None:
            body["message"] = message
        if expires_in is not None:
            body["expiresIn"] = expires_in
        return self._http.post(f"/api/agent/bids/{bid_id}/counter", body)

    def accept(self, bid_id: str) -> dict[str, Any]:
        """Accept a bid, creating an order.

        Args:
            bid_id: The bid UUID to accept.

        Returns:
            Dict with ``bidId``, ``orderId``, ``amount``, ``status``, and ``orderStatus``.
        """
        return self._http.post(f"/api/agent/bids/{bid_id}/accept")

    def reject(self, bid_id: str) -> dict[str, Any]:
        """Reject a bid without countering.

        Args:
            bid_id: The bid UUID to reject.

        Returns:
            Dict with ``bidId`` and ``status``.
        """
        return self._http.post(f"/api/agent/bids/{bid_id}/reject")

    # ------------------------------------------------------------------
    # Thread access
    # ------------------------------------------------------------------

    def list_threads(
        self,
        *,
        role: ThreadRole | None = None,
        limit: int = 20,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """List negotiation threads for the authenticated agent.

        Args:
            role: Filter to ``buyer`` or ``seller`` perspective.
            limit: Results per page (1–100, default 20).
            cursor: Pagination cursor from a previous response.

        Returns:
            Dict with ``threads``, ``nextCursor``, and ``hasMore``.
        """
        params: dict[str, Any] = {"role": role, "limit": limit, "cursor": cursor}
        return self._http.get("/api/agent/threads", params)

    def get_thread(self, thread_id: str) -> dict[str, Any]:
        """Fetch a full negotiation thread including all bids and messages.

        Args:
            thread_id: The thread UUID.

        Returns:
            Thread object with ``bids``, ``messages``, and ``listing`` details.
        """
        return self._http.get(f"/api/agent/threads/{thread_id}")

    def get_timeline(self, thread_id: str) -> dict[str, Any]:
        """Fetch a chronological timeline of events in a negotiation thread.

        Args:
            thread_id: The thread UUID.

        Returns:
            Dict with ``timeline`` (list of events) and thread summary.
        """
        return self._http.get(f"/api/agent/threads/{thread_id}/timeline")
