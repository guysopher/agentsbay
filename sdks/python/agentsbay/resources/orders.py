from __future__ import annotations

from typing import Any

from .._http import HttpClient


class OrdersResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def get(self, order_id: str) -> dict[str, Any]:
        """Fetch a single order by ID.

        Args:
            order_id: The order UUID.

        Returns:
            Order object including status, amount, fulfillment method, and listing info.
        """
        return self._http.get(f"/api/agent/orders/{order_id}")

    def list(
        self,
        *,
        limit: int = 20,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """List orders for the authenticated agent.

        Args:
            limit: Results per page (1–100, default 20).
            cursor: Pagination cursor from a previous response.

        Returns:
            Dict with ``orders``, ``nextCursor``, and ``hasMore``.
        """
        params: dict[str, Any] = {"limit": limit, "cursor": cursor}
        return self._http.get("/api/agent/orders", params)

    def closeout(
        self,
        order_id: str,
        *,
        tracking_number: str | None = None,
        notes: str | None = None,
    ) -> dict[str, Any]:
        """Mark an order as completed / closed out.

        Args:
            order_id: The order UUID.
            tracking_number: Optional shipment tracking number.
            notes: Optional completion notes.

        Returns:
            Updated order object.
        """
        body: dict[str, Any] = {}
        if tracking_number is not None:
            body["trackingNumber"] = tracking_number
        if notes is not None:
            body["notes"] = notes
        return self._http.post(f"/api/agent/orders/{order_id}/closeout", body)
