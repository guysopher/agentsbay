import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient, mockFetch } from "./helpers.js";
import type { Order, OrderListResult } from "../src/types.js";

afterEach(() => vi.restoreAllMocks());

const mockOrder: Order = {
  id: "order-1",
  listingId: "listing-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  amount: 4500,
  currency: "USD",
  status: "CONFIRMED",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("getOrders", () => {
  it("calls GET /api/agent/orders", async () => {
    const spy = mockFetch(200, { orders: [mockOrder], hasMore: false } as OrderListResult);
    const result = await createClient().getOrders();
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/orders");
    expect((init as RequestInit).method).toBe("GET");
    expect(result.orders[0].id).toBe("order-1");
  });

  it("forwards status filter as comma-separated string", async () => {
    const spy = mockFetch(200, { orders: [], hasMore: false });
    await createClient().getOrders({ status: ["CONFIRMED", "IN_PROGRESS"] });
    const [url] = spy.mock.calls[0];
    expect(url).toContain("status=CONFIRMED%2CIN_PROGRESS");
  });

  it("forwards pagination", async () => {
    const spy = mockFetch(200, { orders: [], hasMore: false });
    await createClient().getOrders(undefined, { cursor: "cursor-abc", limit: 10 });
    const [url] = spy.mock.calls[0];
    expect(url).toContain("cursor=cursor-abc");
    expect(url).toContain("limit=10");
  });
});

describe("getOrder", () => {
  it("calls GET /api/agent/orders/:id", async () => {
    const spy = mockFetch(200, mockOrder);
    await createClient().getOrder("order-1");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/orders/order-1");
  });
});

describe("schedulePickup", () => {
  it("calls POST /api/agent/orders/:id/pickup", async () => {
    const spy = mockFetch(200, mockOrder);
    await createClient().schedulePickup("order-1", { scheduledAt: "2026-02-01T10:00:00Z" });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/orders/order-1/pickup");
    expect((init as RequestInit).method).toBe("POST");
  });
});

describe("closeoutOrder", () => {
  it("calls POST /api/agent/orders/:id/closeout", async () => {
    const spy = mockFetch(200, { ...mockOrder, status: "COMPLETED" });
    const result = await createClient().closeoutOrder("order-1");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/orders/order-1/closeout");
    expect((init as RequestInit).method).toBe("POST");
    expect(result.status).toBe("COMPLETED");
  });
});

describe("reviewOrder", () => {
  it("calls POST /api/agent/orders/:id/review", async () => {
    const mockReview = {
      id: "review-1",
      orderId: "order-1",
      reviewerId: "buyer-1",
      revieweeId: "seller-1",
      rating: 5,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const spy = mockFetch(200, mockReview);
    const result = await createClient().reviewOrder("order-1", { rating: 5, comment: "Great!" });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/orders/order-1/review");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.rating).toBe(5);
    expect(result.rating).toBe(5);
  });
});
