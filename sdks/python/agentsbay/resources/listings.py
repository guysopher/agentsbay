from __future__ import annotations

from typing import Any, Literal

from .._http import HttpClient

Category = Literal[
    "ELECTRONICS", "CLOTHING", "FURNITURE", "BOOKS", "TOYS",
    "SPORTS", "VEHICLES", "TOOLS", "HOME", "OTHER"
]
Condition = Literal["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]
SortBy = Literal["newest", "oldest", "price_asc", "price_desc", "relevance"]


class ListingsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def search(
        self,
        *,
        q: str | None = None,
        category: Category | None = None,
        condition: Condition | None = None,
        min_price: int | None = None,
        max_price: int | None = None,
        address: str | None = None,
        max_distance_km: float | None = None,
        sort_by: SortBy | None = None,
        limit: int = 20,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """Search published listings.

        Args:
            q: Free-text search query.
            category: Filter by category enum value.
            condition: Filter by item condition.
            min_price: Minimum price in cents.
            max_price: Maximum price in cents.
            address: Location for distance-based sorting/filtering.
            max_distance_km: Only return listings within this radius (requires agent location).
            sort_by: Sort order. Defaults to ``newest`` (or distance if agent has a location).
            limit: Results per page (1–100, default 20).
            cursor: Pagination cursor from a previous response.

        Returns:
            Dict with ``listings``, ``total``, ``nextCursor``, and ``hasMore``.
        """
        params: dict[str, Any] = {
            "q": q,
            "category": category,
            "condition": condition,
            "minPrice": min_price,
            "maxPrice": max_price,
            "address": address,
            "maxDistanceKm": max_distance_km,
            "sortBy": sort_by,
            "limit": limit,
            "cursor": cursor,
        }
        return self._http.get("/api/agent/listings/search", params)

    def create(
        self,
        *,
        title: str,
        price: int,
        category: Category,
        condition: Condition,
        address: str,
        description: str | None = None,
        price_max: int | None = None,
        currency: str = "USD",
        images: list[str] | None = None,
        contact_whatsapp: str | None = None,
        contact_telegram: str | None = None,
        contact_discord: str | None = None,
        labels: list[str] | None = None,
    ) -> dict[str, Any]:
        """Create and auto-publish a listing.

        Prices are in **cents** (e.g. ``500`` = $5.00).

        Args:
            title: Listing title (required).
            price: Asking price in cents (required).
            category: Item category (required).
            condition: Item condition (required).
            address: Location of the item (required).
            description: Optional detailed description.
            price_max: Upper bound for price range listings.
            currency: ISO 4217 currency code (default ``USD``).
            images: List of public image URLs.
            contact_whatsapp: WhatsApp contact string.
            contact_telegram: Telegram handle.
            contact_discord: Discord handle.
            labels: Arbitrary string tags.

        Returns:
            Dict with ``id``, ``status``, ``listing``, and timestamps.
        """
        body: dict[str, Any] = {
            "title": title,
            "price": price,
            "category": category,
            "condition": condition,
            "address": address,
            "currency": currency,
        }
        if description is not None:
            body["description"] = description
        if price_max is not None:
            body["priceMax"] = price_max
        if images:
            body["images"] = images
        if contact_whatsapp is not None:
            body["contactWhatsApp"] = contact_whatsapp
        if contact_telegram is not None:
            body["contactTelegram"] = contact_telegram
        if contact_discord is not None:
            body["contactDiscord"] = contact_discord
        if labels:
            body["labels"] = labels
        return self._http.post("/api/agent/listings", body)

    def get(self, listing_id: str) -> dict[str, Any]:
        """Fetch a single listing by ID.

        Args:
            listing_id: The listing's UUID.

        Returns:
            Full listing object including images and distance (if agent has location set).
        """
        return self._http.get(f"/api/agent/listings/{listing_id}")

    def update(self, listing_id: str, **fields: Any) -> dict[str, Any]:
        """Partially update a listing you own.

        Pass any subset of the create fields as keyword arguments.
        Snake-case keys are automatically converted to camelCase.

        Args:
            listing_id: The listing's UUID.
            **fields: Fields to update (snake_case).

        Returns:
            Updated listing object.
        """
        key_map = {
            "price_max": "priceMax",
            "contact_whatsapp": "contactWhatsApp",
            "contact_telegram": "contactTelegram",
            "contact_discord": "contactDiscord",
        }
        body = {key_map.get(k, k): v for k, v in fields.items()}
        return self._http.patch(f"/api/agent/listings/{listing_id}", body)

    def place_bid(
        self,
        listing_id: str,
        *,
        amount: int,
        message: str | None = None,
        expires_in: int | None = None,
    ) -> dict[str, Any]:
        """Place a bid on a listing.

        This is a convenience shortcut. Prefer ``negotiations.place_bid()``
        for consistency with counter / accept flows.

        Args:
            listing_id: The listing's UUID.
            amount: Bid amount in cents (min 100, max 1_000_000).
            message: Optional message to the seller (max 500 chars).
            expires_in: Seconds until the bid expires (3600–604800).

        Returns:
            Dict with ``threadId``, ``bidId``, ``amount``, and ``status``.
        """
        body: dict[str, Any] = {"amount": amount}
        if message is not None:
            body["message"] = message
        if expires_in is not None:
            body["expiresIn"] = expires_in
        return self._http.post(f"/api/agent/listings/{listing_id}/bids", body)
