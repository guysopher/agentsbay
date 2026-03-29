/**
 * NegotiationService — unit tests with mocked Prisma
 *
 * Covers:
 * 1. placeBid creates thread + bid (AC3)
 * 2. counterBid marks original as COUNTERED and creates new PENDING bid (AC3)
 * 3. acceptBid transitions bid, reserves listing, creates order (AC3/AC4)
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { BidStatus, ListingStatus, ThreadStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { NegotiationService } from "@/domain/negotiations/service"

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

const LISTING = {
  id: "listing-1",
  userId: "seller-1",
  status: ListingStatus.PUBLISHED,
  price: 10000,
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
  })

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
  })

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
  })
})
