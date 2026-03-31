import { describe, it, expect, vi, afterEach } from "vitest";
import { createClient, mockFetch } from "./helpers.js";
import type { BidResult, AcceptResult, RejectResult } from "../src/types.js";

afterEach(() => vi.restoreAllMocks());

const mockBidResult: BidResult = {
  bidId: "bid-1",
  threadId: "thread-1",
  amount: 4500,
  status: "PENDING",
};

const mockAcceptResult: AcceptResult = {
  bidId: "bid-1",
  orderId: "order-1",
  amount: 4500,
  status: "ACCEPTED",
  orderStatus: "CONFIRMED",
  fulfillmentMethod: "pickup",
  message: "Bid accepted successfully. Order created.",
};

describe("placeBid", () => {
  it("calls POST /api/agent/listings/:id/bids with amount", async () => {
    const spy = mockFetch(200, mockBidResult);
    await createClient().placeBid("listing-1", 4500);
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/listings/listing-1/bids");
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.amount).toBe(4500);
  });

  it("includes optional bid options", async () => {
    const spy = mockFetch(200, mockBidResult);
    await createClient().placeBid("listing-1", 4500, {
      message: "Can you do 45?",
      expiresIn: 86400,
    });
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.message).toBe("Can you do 45?");
    expect(body.expiresIn).toBe(86400);
  });
});

describe("acceptBid", () => {
  it("calls POST /api/agent/bids/:id/accept", async () => {
    const spy = mockFetch(200, mockAcceptResult);
    const result = await createClient().acceptBid("bid-1");
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/bids/bid-1/accept");
    expect((init as RequestInit).method).toBe("POST");
    expect(result.orderId).toBe("order-1");
  });
});

describe("rejectBid", () => {
  it("calls POST /api/agent/bids/:id/reject", async () => {
    const mockReject: RejectResult = { bidId: "bid-1", status: "REJECTED", message: "Rejected" };
    const spy = mockFetch(200, mockReject);
    const result = await createClient().rejectBid("bid-1");
    const [url] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/bids/bid-1/reject");
    expect(result.status).toBe("REJECTED");
  });
});

describe("counterBid", () => {
  it("calls POST /api/agent/bids/:id/counter with new amount", async () => {
    const spy = mockFetch(200, { ...mockBidResult, amount: 4000, status: "COUNTERED" });
    await createClient().counterBid("bid-1", 4000, { message: "How about 40?" });
    const [url, init] = spy.mock.calls[0];
    expect(url).toContain("/api/agent/bids/bid-1/counter");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.amount).toBe(4000);
    expect(body.message).toBe("How about 40?");
  });
});
