import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { db } from "@/lib/db"
import { NegotiationService } from "@/domain/negotiations/service"
import { POST as placeBidPOST } from "@/app/api/agent/listings/[id]/bids/route"
import { POST as sendMessagePOST } from "@/app/api/agent/listings/[id]/messages/route"
import { POST as counterBidPOST } from "@/app/api/agent/bids/[id]/counter/route"
import { POST as acceptBidPOST } from "@/app/api/agent/bids/[id]/accept/route"
import { POST as rejectBidPOST } from "@/app/api/agent/bids/[id]/reject/route"
import { GET as listThreadsGET } from "@/app/api/agent/threads/route"

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("negotiation API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
  })

  it("fails fast when runtime bootstrap env is missing", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    const originalNextAuthUrl = process.env.NEXTAUTH_URL
    const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    try {
      const response = await placeBidPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-1/bids", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ amount: 8500 }),
        }),
        createContext("listing-1")
      )

      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
      expect(body.error.details.missingEnv).toEqual(
        expect.arrayContaining(["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"])
      )
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl
      }

      if (originalNextAuthUrl === undefined) {
        delete process.env.NEXTAUTH_URL
      } else {
        process.env.NEXTAUTH_URL = originalNextAuthUrl
      }

      if (originalNextAuthSecret === undefined) {
        delete process.env.NEXTAUTH_SECRET
      } else {
        process.env.NEXTAUTH_SECRET = originalNextAuthSecret
      }
    }
  })

  it("places a bid successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const placeBidSpy = jest.spyOn(NegotiationService, "placeBid").mockResolvedValue({
      thread: { id: "thread-1" },
      bid: {
        id: "bid-1",
        amount: 8500,
        status: "PENDING",
        expiresAt: "2026-03-28T00:00:00.000Z",
      },
    } as never)

    const response = await placeBidPOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/bids", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 8500, message: "Would you take $85?" }),
      }),
      createContext("listing-1")
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(placeBidSpy).toHaveBeenCalledWith({
      listingId: "listing-1",
      buyerId: "buyer-1",
      buyerAgentId: "agent-1",
      amount: 8500,
      message: "Would you take $85?",
      expiresIn: undefined,
    })
    expect(body.data.bidId).toBe("bid-1")
  })

  it("sends a listing message successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const sendMessageSpy = jest.spyOn(NegotiationService, "sendMessage").mockResolvedValue({
      thread: { id: "thread-2" },
      message: {
        id: "message-1",
        createdAt: "2026-03-28T00:00:00.000Z",
      },
    } as never)

    const response = await sendMessagePOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Is this still available?", isAgent: true }),
      }),
      createContext("listing-1")
    )

    const body = await response.json()

    expect(response.status).toBe(201)
    expect(sendMessageSpy).toHaveBeenCalledWith("listing-1", "buyer-1", {
      content: "Is this still available?",
      isAgent: true,
    })
    expect(body.data.threadId).toBe("thread-2")
    expect(body.data.messageId).toBe("message-1")
  })

  it("rejects place bid without auth", async () => {
    const response = await placeBidPOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/bids", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 8500 }),
      }),
      createContext("listing-1")
    )

    expect(response.status).toBe(401)
  })

  it("rejects listing messages without auth", async () => {
    const response = await sendMessagePOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Hello", isAgent: true }),
      }),
      createContext("listing-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 400 for bid placement validation failures", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "placeBid")
      .mockRejectedValue(new ValidationError("Cannot bid on unpublished listing"))

    const response = await placeBidPOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/bids", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 8500 }),
      }),
      createContext("listing-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 400 for listing message validation failures", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)

    const response = await sendMessagePOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "", isAgent: true }),
      }),
      createContext("listing-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 404 when messaging a missing listing", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "sendMessage")
      .mockRejectedValue(new NotFoundError("Listing"))

    const response = await sendMessagePOST(
      new NextRequest("http://localhost/api/agent/listings/listing-1/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "Hello", isAgent: true }),
      }),
      createContext("listing-1")
    )

    expect(response.status).toBe(404)
  })

  it("counters a bid successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    const counterBidSpy = jest.spyOn(NegotiationService, "counterBid").mockResolvedValue({
      id: "bid-2",
      amount: 9000,
      status: "PENDING",
      expiresAt: "2026-03-28T00:00:00.000Z",
    } as never)

    const response = await counterBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/counter", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 9000 }),
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(201)
    expect(counterBidSpy).toHaveBeenCalledWith("bid-1", "seller-1", {
      amount: 9000,
      agentId: "agent-2",
    })
  })

  it("rejects counter bid without auth", async () => {
    const response = await counterBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/counter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 9000 }),
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 400 for invalid counter transitions", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "counterBid")
      .mockRejectedValue(new ValidationError("Bid is already ACCEPTED"))

    const response = await counterBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/counter", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 9000 }),
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(400)
  })

  it("accepts a bid successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    const acceptBidSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({
      bid: {
        id: "bid-1",
        amount: 9200,
        status: "ACCEPTED",
      },
      order: {
        id: "order-1",
        status: "PENDING_PAYMENT",
        fulfillmentMethod: "PICKUP",
      },
    } as never)

    const response = await acceptBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/accept", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(acceptBidSpy).toHaveBeenCalledWith("bid-1", "seller-1")
    expect(body.data.orderId).toBe("order-1")
  })

  it("rejects accept bid without auth", async () => {
    const response = await acceptBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/accept", {
        method: "POST",
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 400 for invalid accept transitions", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest.spyOn(NegotiationService, "acceptBid").mockRejectedValue(new ValidationError("Bid has expired"))

    const response = await acceptBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/accept", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 403 when a non-participant counters a bid", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-3",
        userId: "outsider-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "counterBid")
      .mockRejectedValue(new ForbiddenError("Not authorized for this thread"))

    const response = await counterBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/counter", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 9000 }),
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(403)
  })

  it("returns 403 when seller tries to accept their own counter-bid (AGE-37)", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "seller-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "acceptBid")
      .mockRejectedValue(new ForbiddenError("Cannot accept your own bid"))

    const response = await acceptBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/accept", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(403)
  })

  it("returns 403 when buyer tries to counter their own bid (AGE-37)", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "buyer-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "counterBid")
      .mockRejectedValue(new ForbiddenError("Cannot counter your own bid"))

    const response = await counterBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/counter", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: 8000 }),
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(403)
  })

  // ── POST /api/agent/bids/[id]/reject ─────────────────────────────────────

  it("rejects a bid successfully (200)", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    const rejectBidSpy = jest.spyOn(NegotiationService, "rejectBid").mockResolvedValue({
      id: "bid-1",
      status: "REJECTED",
    } as never)

    const response = await rejectBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/reject", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(rejectBidSpy).toHaveBeenCalledWith("bid-1", "seller-1")
    expect(body.data.bidId).toBe("bid-1")
    expect(body.data.status).toBe("REJECTED")
  })

  it("rejects reject bid without auth (401)", async () => {
    const response = await rejectBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/reject", {
        method: "POST",
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 404 when rejecting an unknown bid", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest.spyOn(NegotiationService, "rejectBid").mockRejectedValue(new NotFoundError("Bid"))

    const response = await rejectBidPOST(
      new NextRequest("http://localhost/api/agent/bids/missing/reject", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("missing")
    )

    expect(response.status).toBe(404)
  })

  it("returns 403 when a non-participant rejects a bid", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-3",
        userId: "outsider-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "rejectBid")
      .mockRejectedValue(new ForbiddenError("Not authorized for this thread"))

    const response = await rejectBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/reject", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(403)
  })

  it("returns 400 when rejecting a bid already in a terminal state", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest
      .spyOn(NegotiationService, "rejectBid")
      .mockRejectedValue(new ValidationError("Bid is already ACCEPTED"))

    const response = await rejectBidPOST(
      new NextRequest("http://localhost/api/agent/bids/bid-1/reject", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("bid-1")
    )

    expect(response.status).toBe(400)
  })

  // ── GET /api/agent/threads ────────────────────────────────────────────────

  it("lists threads for authenticated agent", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-1", userId: "buyer-1" },
    } as never)
    const listThreadsSpy = jest.spyOn(NegotiationService, "listThreads").mockResolvedValue({
      items: [
        {
          id: "thread-1",
          listingId: "listing-1",
          buyerId: "buyer-1",
          sellerId: "seller-1",
          status: "ACTIVE",
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-02"),
          closedAt: null,
          Listing: { id: "listing-1", title: "Lamp", price: 5000, currency: "USD", status: "PUBLISHED" },
          Bid: [],
        },
      ],
      nextCursor: null,
      hasMore: false,
    } as never)

    const response = await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(listThreadsSpy).toHaveBeenCalledWith("buyer-1", undefined, undefined, 20)
    expect(body.data.count).toBe(1)
    expect(body.data.threads[0].id).toBe("thread-1")
  })

  it("passes role=buyer filter through to listThreads", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-1", userId: "buyer-1" },
    } as never)
    const listThreadsSpy = jest
      .spyOn(NegotiationService, "listThreads")
      .mockResolvedValue({ items: [], nextCursor: null, hasMore: false } as never)

    await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads?role=buyer", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    expect(listThreadsSpy).toHaveBeenCalledWith("buyer-1", "buyer", undefined, 20)
  })

  it("rejects list threads without auth", async () => {
    const response = await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads"),
      { params: Promise.resolve({}) }
    )

    expect(response.status).toBe(401)
  })

  it("returns 503 when runtime bootstrap is missing for list threads", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    const originalNextAuthUrl = process.env.NEXTAUTH_URL
    const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    try {
      const response = await listThreadsGET(
        new NextRequest("http://localhost/api/agent/threads", {
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        { params: Promise.resolve({}) }
      )

      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl
      }
      if (originalNextAuthUrl === undefined) {
        delete process.env.NEXTAUTH_URL
      } else {
        process.env.NEXTAUTH_URL = originalNextAuthUrl
      }
      if (originalNextAuthSecret === undefined) {
        delete process.env.NEXTAUTH_SECRET
      } else {
        process.env.NEXTAUTH_SECRET = originalNextAuthSecret
      }
    }
  })

  it("returns 400 for invalid role query param", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-1", userId: "buyer-1" },
    } as never)

    const response = await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads?role=invalid", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    expect(response.status).toBe(400)
  })

  it("passes role=seller filter through to listThreads", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-2", userId: "seller-1" },
    } as never)
    const listThreadsSpy = jest
      .spyOn(NegotiationService, "listThreads")
      .mockResolvedValue({ items: [], nextCursor: null, hasMore: false } as never)

    await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads?role=seller", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    expect(listThreadsSpy).toHaveBeenCalledWith("seller-1", "seller", undefined, 20)
  })

  it("returns empty threads list when agent has no threads", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-1", userId: "buyer-1" },
    } as never)
    jest.spyOn(NegotiationService, "listThreads").mockResolvedValue(
      { items: [], nextCursor: null, hasMore: false } as never
    )

    const response = await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.threads).toHaveLength(0)
    expect(body.data.count).toBe(0)
  })

  it("returns 500 when NegotiationService.listThreads throws", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: { id: "agent-1", userId: "buyer-1" },
    } as never)
    jest
      .spyOn(NegotiationService, "listThreads")
      .mockRejectedValue(new Error("Database connection lost"))

    const response = await listThreadsGET(
      new NextRequest("http://localhost/api/agent/threads", {
        headers: { Authorization: "Bearer sk_test_123" },
      }),
      { params: Promise.resolve({}) }
    )

    expect(response.status).toBe(500)
  })

  it("returns 404 when accepting an unknown bid", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest.spyOn(NegotiationService, "acceptBid").mockRejectedValue(new NotFoundError("Bid"))

    const response = await acceptBidPOST(
      new NextRequest("http://localhost/api/agent/bids/missing/accept", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("missing")
    )

    expect(response.status).toBe(404)
  })
})
