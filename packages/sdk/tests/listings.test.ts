import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient, mockFetch } from "./helpers.js";
import type { Listing, ListingSearchResult } from "../src/types.js";

afterEach(() => vi.restoreAllMocks());

const mockListing: Listing = {
  id: "listing-1",
  title: "Vintage Bike",
  description: "Great condition vintage bicycle",
  labels: [],
  category: "SPORTS",
  condition: "GOOD",
  price: 5000,
  currency: "USD",
  address: "123 Main St",
  pickupAvailable: true,
  deliveryAvailable: false,
  status: "PUBLISHED",
  images: [],
  sellerId: "agent-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("searchListings", () => {
  it("calls GET /api/agent/listings/search with query", async () => {
    const spy = mockFetch(200, { items: [mockListing], hasMore: false });
    await createClient().searchListings("bike");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/search");
    expect(url).toContain("q=bike");
  });

  it("forwards filters and pagination", async () => {
    const spy = mockFetch(200, { items: [], hasMore: false });
    await createClient().searchListings(
      undefined,
      { category: "ELECTRONICS", maxPrice: 10000 },
      { limit: 5, cursor: "abc" }
    );
    const [url] = spy.mock.calls[0];
    expect(url).toContain("category=ELECTRONICS");
    expect(url).toContain("maxPrice=10000");
    expect(url).toContain("limit=5");
    expect(url).toContain("cursor=abc");
  });

  it("returns typed result", async () => {
    mockFetch(200, { items: [mockListing], hasMore: false } as ListingSearchResult);
    const result = await createClient().searchListings("bike");
    expect(result.items[0].title).toBe("Vintage Bike");
  });
});

describe("createListing", () => {
  it("calls POST /api/agent/listings with body", async () => {
    const spy = mockFetch(201, mockListing);
    await createClient().createListing({
      title: "Vintage Bike",
      description: "Great condition vintage bicycle",
      category: "SPORTS",
      condition: "GOOD",
      price: 5000,
      address: "123 Main St",
    });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.title).toBe("Vintage Bike");
  });
});

describe("getListing", () => {
  it("calls GET /api/agent/listings/:id", async () => {
    const spy = mockFetch(200, mockListing);
    await createClient().getListing("listing-1");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/listing-1");
  });
});

describe("updateListing", () => {
  it("calls PATCH /api/agent/listings/:id", async () => {
    const spy = mockFetch(200, { ...mockListing, price: 4500 });
    await createClient().updateListing("listing-1", { price: 4500 });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/listing-1");
    expect((init as RequestInit).method).toBe("PATCH");
  });
});

describe("deleteListing", () => {
  it("calls DELETE /api/agent/listings/:id", async () => {
    const spy = mockFetch(200, {});
    await createClient().deleteListing("listing-1");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/listing-1");
    expect((init as RequestInit).method).toBe("DELETE");
  });
});

describe("publishListing / pauseListing / relistListing", () => {
  it("publishListing calls POST /api/agent/listings/:id/publish", async () => {
    const spy = mockFetch(200, mockListing);
    await createClient().publishListing("listing-1");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/publish");
    expect((init as RequestInit).method).toBe("POST");
  });

  it("pauseListing calls POST /api/agent/listings/:id/pause", async () => {
    const spy = mockFetch(200, mockListing);
    await createClient().pauseListing("listing-1");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/pause");
  });

  it("relistListing calls POST /api/agent/listings/:id/relist", async () => {
    const spy = mockFetch(200, mockListing);
    await createClient().relistListing("listing-1");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/relist");
  });
});

describe("sendMessage", () => {
  it("calls POST /api/agent/listings/:id/messages", async () => {
    const spy = mockFetch(200, { messageId: "msg-1", threadId: "thread-1", content: "Hi!", createdAt: "2026-01-01" });
    await createClient().sendMessage("listing-1", "Hi!");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/listing-1/messages");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.message).toBe("Hi!");
  });
});
