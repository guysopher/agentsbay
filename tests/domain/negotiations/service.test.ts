/**
 * NegotiationService — unit tests with mocked Prisma
 *
 * Covers:
 * 1. placeBid — creates thread + bid; validates listing, ownership, amount, thread state
 * 2. counterBid — marks original as COUNTERED and creates new PENDING bid; turn enforcement
 * 3. acceptBid — closes negotiation, creates order; turn enforcement, expiry, auth
 * 4. rejectBid — rejects bid, updates thread; auth, state transition
 * 5. getThread — returns thread with bids; auth check
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { BidStatus, ListingStatus, ThreadStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

const LISTING = {
  id: "listing-1",
  userId: "seller-1",
  status: ListingStatus.PUBLISHED,
  price: 100,
  pickupAvailable: true,
  address: "Test City",
  User: { id: "seller-1", name: "Seller" },
}

const THREAD = {
  id: "thread-1",
  listingId: "listing-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  status: ThreadStatus.ACTIVE,
}

const BID = {
  id: "bid-1",
  threadId: "thread-1",
  amount: 8500,
  status: BidStatus.PENDING,
  placedByUserId: "buyer-1",
  expiresAt: new Date(Date.now() + 86400_000),
  NegotiationThread: {
    ...THREAD,
    Listing: LISTING,
  },
}

describe("NegotiationService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── placeBid ────────────────────────────────────────────────────────────────

  describe("placeBid", () => {
    it("places a bid and creates a negotiation thread", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(LISTING as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        const thread = { ...THREAD }
        const bid = {
          id: "bid-new",
          threadId: thread.id,
          amount: 8500,
          status: BidStatus.PENDING,
          message: "Would you take $85?",
        }
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(thread),
          },
          bid: {
            create: jest.fn().mockResolvedValue(bid),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        })
      })

      const result = await NegotiationService.placeBid({
        listingId: "listing-1",
        buyerId: "buyer-1",
        amount: 8500,
        message: "Would you take $85?",
      })

      expect((result.thread as any).listingId).toBe("listing-1")
      expect((result.thread as any).buyerId).toBe("buyer-1")
      expect((result.thread as any).status).toBe(ThreadStatus.ACTIVE)
      expect((result.bid as any).status).toBe(BidStatus.PENDING)
      expect((result.bid as any).message).toBe("Would you take $85?")
    })

    it("throws NotFoundError when listing does not exist", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(null)

      await expect(
        NegotiationService.placeBid({ listingId: "missing", buyerId: "buyer-1", amount: 8500 })
      ).rejects.toThrow(NotFoundError)
    })

    it("throws ValidationError when bidding on own listing", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce({
        ...LISTING,
        userId: "buyer-1",
      } as never)

      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 8500 })
      ).rejects.toThrow(ValidationError)
    })

    it("throws ValidationError when listing is not published", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce({
        ...LISTING,
        status: ListingStatus.DRAFT,
      } as never)

      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 8500 })
      ).rejects.toThrow(ValidationError)
    })

    it("throws ValidationError when bid amount is below minimum", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(LISTING as never)

      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 50 })
      ).rejects.toThrow(ValidationError)
    })

    it("throws ValidationError when bid amount is unreasonably high", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(LISTING as never)

      // price is $100 (dollars), cap is 100 * 100 * 2 = 20000 cents ($200) — bid at 25000 cents ($250)
      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 25000 })
      ).rejects.toThrow(ValidationError)
    })

    it("throws ValidationError when existing thread is not active", async () => {
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(LISTING as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue({ ...THREAD, status: ThreadStatus.ACCEPTED }),
          },
          bid: {
            create: jest.fn(),
            updateMany: jest.fn(),
          },
        })
      })

      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 8500 })
      ).rejects.toThrow(ValidationError)
    })

    // ── Regression: AGE-313 — sellerId FK constraint fix ─────────────────────
    // NegotiationThread.sellerId must be a User.id. Before this fix, agent-created
    // listings caused a FK violation because listing.agentId (an Agent ID) was used
    // instead of listing.userId. Bids with amount >= 100 hit the DB and returned 500.

    it("regression AGE-313: uses listing.userId as sellerId for agent-created listings", async () => {
      const agentCreatedListing = {
        ...LISTING,
        userId: "seller-user-1",
        agentId: "aaaaaaaa-0000-0000-0000-000000000099", // valid UUID agent ID — must NOT be used as sellerId
      }
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(agentCreatedListing as never)

      let capturedSellerIdOnCreate: string | undefined
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        const thread = { ...THREAD, sellerId: agentCreatedListing.userId }
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }: { data: { sellerId: string } }) => {
              capturedSellerIdOnCreate = data.sellerId
              return Promise.resolve(thread)
            }),
          },
          bid: {
            create: jest.fn().mockResolvedValue({ id: "bid-new", amount: 10000, status: BidStatus.PENDING }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        })
      })

      await NegotiationService.placeBid({
        listingId: "listing-1",
        buyerId: "buyer-1",
        buyerAgentId: "agent-buyer",
        amount: 10000,
      })

      // sellerId must be the human User ID — never the agent ID
      expect(capturedSellerIdOnCreate).toBe("seller-user-1")
      expect(capturedSellerIdOnCreate).not.toBe("aaaaaaaa-0000-0000-0000-000000000099")
    })

    it("regression AGE-313: uses listing.userId as sellerId for user-created listings (no agentId)", async () => {
      const userCreatedListing = {
        ...LISTING,
        userId: "seller-user-2",
        agentId: null,
      }
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(userCreatedListing as never)

      let capturedSellerIdOnCreate: string | undefined
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        const thread = { ...THREAD, sellerId: userCreatedListing.userId }
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }: { data: { sellerId: string } }) => {
              capturedSellerIdOnCreate = data.sellerId
              return Promise.resolve(thread)
            }),
          },
          bid: {
            create: jest.fn().mockResolvedValue({ id: "bid-new", amount: 10000, status: BidStatus.PENDING }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        })
      })

      await NegotiationService.placeBid({
        listingId: "listing-1",
        buyerId: "buyer-1",
        amount: 10000,
      })

      expect(capturedSellerIdOnCreate).toBe("seller-user-2")
    })

    it("regression AGE-313: amount >= 100 succeeds and does not throw for agent-created listing", async () => {
      const agentCreatedListing = {
        ...LISTING,
        userId: "seller-user-1",
        agentId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        price: 500,  // $500, so 50000 cents cap — amounts up to 100000 allowed
      }
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(agentCreatedListing as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ ...THREAD, sellerId: "seller-user-1" }),
          },
          bid: {
            create: jest.fn().mockResolvedValue({ id: "bid-new", amount: 10000, status: BidStatus.PENDING }),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        })
      })

      // Must NOT throw — this was returning 500 before AGE-313 was fixed
      await expect(
        NegotiationService.placeBid({ listingId: "listing-1", buyerId: "buyer-1", amount: 10000 })
      ).resolves.toBeDefined()
    })
  })

  // ─── sendMessage (AGE-313 regression) ───────────────────────────────────────

  describe("sendMessage — regression AGE-313", () => {
    it("uses listing.userId as sellerId for agent-created listings", async () => {
      const agentCreatedListing = {
        id: "listing-1",
        userId: "seller-user-1",
        agentId: "aaaaaaaa-0000-0000-0000-000000000099", // valid UUID agent ID
        status: "PUBLISHED",
        price: 100,
      }
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(agentCreatedListing as never)

      let capturedSellerIdOnCreate: string | undefined
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        const thread = { id: "thread-1", sellerId: agentCreatedListing.userId }
        const message = { id: "msg-1", createdAt: new Date() }
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }: { data: { sellerId: string } }) => {
              capturedSellerIdOnCreate = data.sellerId
              return Promise.resolve(thread)
            }),
            update: jest.fn().mockResolvedValue(thread),
          },
          negotiationMessage: {
            create: jest.fn().mockResolvedValue(message),
          },
        })
      })

      await NegotiationService.sendMessage("listing-1", "buyer-1", {
        content: "Is this still available?",
        isAgent: true,
      })

      expect(capturedSellerIdOnCreate).toBe("seller-user-1")
      expect(capturedSellerIdOnCreate).not.toBe("aaaaaaaa-0000-0000-0000-000000000099")
    })

    it("uses listing.userId as sellerId for user-created listings (no agentId)", async () => {
      const userCreatedListing = {
        id: "listing-1",
        userId: "seller-user-2",
        agentId: null,
        status: "PUBLISHED",
        price: 100,
      }
      jest.spyOn(db.listing, "findUnique").mockResolvedValueOnce(userCreatedListing as never)

      let capturedSellerIdOnCreate: string | undefined
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        const thread = { id: "thread-1", sellerId: userCreatedListing.userId }
        const message = { id: "msg-1", createdAt: new Date() }
        return fn({
          negotiationThread: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation(({ data }: { data: { sellerId: string } }) => {
              capturedSellerIdOnCreate = data.sellerId
              return Promise.resolve(thread)
            }),
            update: jest.fn().mockResolvedValue(thread),
          },
          negotiationMessage: {
            create: jest.fn().mockResolvedValue(message),
          },
        })
      })

      await NegotiationService.sendMessage("listing-1", "buyer-1", {
        content: "Hello",
        isAgent: false,
      })

      expect(capturedSellerIdOnCreate).toBe("seller-user-2")
    })
  })

  // ─── counterBid ──────────────────────────────────────────────────────────────

  describe("counterBid", () => {
    it("counters a pending bid and marks the original as countered", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)
      const counterBid = {
        id: "bid-counter",
        threadId: "thread-1",
        amount: 9000,
        status: BidStatus.PENDING,
        placedByUserId: "seller-1",
      }
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          bid: {
            update: jest.fn().mockResolvedValue({ ...BID, status: BidStatus.COUNTERED }),
            create: jest.fn().mockResolvedValue(counterBid),
          },
          negotiationThread: {
            update: jest.fn().mockResolvedValue(THREAD),
          },
        })
      })

      const result = await NegotiationService.counterBid("bid-1", "seller-1", {
        amount: 9000,
        message: "Can you do $90?",
      })

      expect((result as any).status).toBe(BidStatus.PENDING)
      expect((result as any).amount).toBe(9000)
      expect((result as any).threadId).toBe("thread-1")
    })

    it("throws NotFoundError when bid does not exist", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(null)

      await expect(
        NegotiationService.counterBid("missing-bid", "seller-1", { amount: 9000 })
      ).rejects.toThrow(NotFoundError)
    })

    it("enforces turns — buyer cannot counter their own bid", async () => {
      // BID was placed by buyer-1; buyer-1 tries to counter it
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)

      await expect(
        NegotiationService.counterBid("bid-1", "buyer-1", { amount: 8000 })
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws ForbiddenError when user is not in the thread", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)

      await expect(
        NegotiationService.counterBid("bid-1", "stranger", { amount: 9000 })
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws ValidationError when thread is not active", async () => {
      const closedBid = {
        ...BID,
        NegotiationThread: { ...THREAD, status: ThreadStatus.ACCEPTED, Listing: LISTING },
      }
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(closedBid as never)

      await expect(
        NegotiationService.counterBid("bid-1", "seller-1", { amount: 9000 })
      ).rejects.toThrow(ValidationError)
    })
  })

  // ─── acceptBid ───────────────────────────────────────────────────────────────

  describe("acceptBid", () => {
    it("accepts a bid, reserves the listing, and creates an order", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)
      const acceptedBid = { ...BID, status: BidStatus.ACCEPTED }
      const order = {
        id: "order-1",
        threadId: "thread-1",
        listingId: "listing-1",
        buyerId: "buyer-1",
        sellerId: "seller-1",
        amount: 8500,
        status: "PENDING_PAYMENT",
      }
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          bid: {
            update: jest.fn().mockResolvedValue(acceptedBid),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
          negotiationThread: {
            update: jest.fn().mockResolvedValue({ ...THREAD, status: ThreadStatus.ACCEPTED }),
          },
          listing: {
            update: jest.fn().mockResolvedValue({ ...LISTING, status: ListingStatus.RESERVED }),
          },
          order: {
            create: jest.fn().mockResolvedValue(order),
          },
        })
      })

      const result = await NegotiationService.acceptBid("bid-1", "seller-1")

      expect((result.bid as any).status).toBe(BidStatus.ACCEPTED)
      expect((result.order as any).threadId).toBe("thread-1")
      expect((result.order as any).listingId).toBe("listing-1")
      expect((result.order as any).buyerId).toBe("buyer-1")
    })

    it("throws NotFoundError when bid does not exist", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(null)

      await expect(
        NegotiationService.acceptBid("missing-bid", "seller-1")
      ).rejects.toThrow(NotFoundError)
    })

    it("enforces turns — seller cannot accept their own counter-bid", async () => {
      // Bid placed by seller-1 (a counter-offer); seller-1 tries to accept it
      const sellerBid = { ...BID, placedByUserId: "seller-1" }
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(sellerBid as never)

      await expect(
        NegotiationService.acceptBid("bid-1", "seller-1")
      ).rejects.toThrow(ForbiddenError)
    })

    it("enforces turns — buyer cannot accept their own bid", async () => {
      // BID was placed by buyer-1; buyer-1 tries to accept it
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)

      await expect(
        NegotiationService.acceptBid("bid-1", "buyer-1")
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws ForbiddenError when user is not in the thread", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID as never)

      await expect(
        NegotiationService.acceptBid("bid-1", "stranger")
      ).rejects.toThrow(ForbiddenError)
    })

    it("throws ValidationError when bid has expired", async () => {
      const expiredBid = { ...BID, expiresAt: new Date(Date.now() - 1000) }
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(expiredBid as never)

      await expect(
        NegotiationService.acceptBid("bid-1", "seller-1")
      ).rejects.toThrow(ValidationError)
    })
  })

  // ─── rejectBid ───────────────────────────────────────────────────────────────

  describe("rejectBid", () => {
    const BID_WITH_THREAD = {
      ...BID,
      NegotiationThread: THREAD,
    }

    it("rejects a bid and updates the thread", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID_WITH_THREAD as never)
      const rejectedBid = { ...BID, status: BidStatus.REJECTED }
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          bid: {
            update: jest.fn().mockResolvedValue(rejectedBid),
          },
          negotiationThread: {
            update: jest.fn().mockResolvedValue(THREAD),
          },
        })
      })

      const result = await NegotiationService.rejectBid("bid-1", "seller-1")

      expect((result as any).status).toBe(BidStatus.REJECTED)
      expect((result as any).id).toBe("bid-1")
    })

    it("throws NotFoundError when bid does not exist", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(null)

      await expect(
        NegotiationService.rejectBid("missing-bid", "seller-1")
      ).rejects.toThrow(NotFoundError)
    })

    it("throws ForbiddenError when user is not in the thread", async () => {
      jest.spyOn(db.bid, "findUnique").mockResolvedValueOnce(BID_WITH_THREAD as never)

      await expect(
        NegotiationService.rejectBid("bid-1", "stranger")
      ).rejects.toThrow(ForbiddenError)
    })
  })

  // ─── getThread ───────────────────────────────────────────────────────────────

  describe("getThread", () => {
    const FULL_THREAD = {
      ...THREAD,
      Listing: { ...LISTING, ListingImage: [] },
      Bid: [BID],
      NegotiationMessage: [],
    }

    it("returns thread with listing and bids for buyer", async () => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValueOnce(FULL_THREAD as never)

      const result = await NegotiationService.getThread("thread-1", "buyer-1")

      expect((result as any).id).toBe("thread-1")
      expect((result as any).Bid).toHaveLength(1)
      expect((result as any).Listing.id).toBe("listing-1")
    })

    it("returns thread with listing and bids for seller", async () => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValueOnce(FULL_THREAD as never)

      const result = await NegotiationService.getThread("thread-1", "seller-1")

      expect((result as any).id).toBe("thread-1")
    })

    it("throws NotFoundError when thread does not exist", async () => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValueOnce(null)

      await expect(
        NegotiationService.getThread("missing-thread", "buyer-1")
      ).rejects.toThrow(NotFoundError)
    })

    it("throws ForbiddenError when user is not buyer or seller", async () => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValueOnce(FULL_THREAD as never)

      await expect(
        NegotiationService.getThread("thread-1", "stranger")
      ).rejects.toThrow(ForbiddenError)
    })
  })
})
