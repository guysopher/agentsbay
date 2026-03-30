import { describe, it, expect, jest, beforeEach } from "@jest/globals"
import { db } from "@/lib/db"
import { eventBus } from "@/lib/events"
import { NegotiationService } from "@/domain/negotiations/service"
import { registerAutoNegotiationHandlers } from "@/domain/negotiations/auto-negotiation"
import { BidStatus } from "@prisma/client"

// Register handlers once for the test suite
registerAutoNegotiationHandlers()

const SELLER_ID = "user-seller-1"
const BUYER_ID = "user-buyer-1"
const THREAD_ID = "thread-1"
const LISTING_ID = "listing-1"
const BID_ID = "bid-1"

const BASE_AGENT = {
  id: "agent-1",
  autoNegotiate: true,
  requireApproval: false,
  minAcceptAmount: null,
  maxAcceptAmount: null,
  autoRejectBelow: null,
  autoCounterEnabled: false,
  maxBidAmount: null,
}

const BASE_LISTING = {
  id: LISTING_ID,
  price: 100_00, // $100.00
  userId: SELLER_ID,
}

describe("auto-negotiation handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default: no auto-rounds yet
    jest.spyOn(db.bid, "count").mockResolvedValue(0 as never)
    jest.spyOn(db.listing, "findUnique").mockResolvedValue(BASE_LISTING as never)
  })

  describe("bid.placed → seller auto-respond", () => {
    it("does nothing when seller has no active auto-negotiate agent", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue(null as never)
      const acceptSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({} as never)
      const rejectSpy = jest.spyOn(NegotiationService, "rejectBid").mockResolvedValue({} as never)
      const counterSpy = jest.spyOn(NegotiationService, "counterBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 8000,
      })

      expect(acceptSpy).not.toHaveBeenCalled()
      expect(rejectSpy).not.toHaveBeenCalled()
      expect(counterSpy).not.toHaveBeenCalled()
    })

    it("does nothing when requireApproval is true", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        requireApproval: true,
      } as never)
      const acceptSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 9000,
      })

      expect(acceptSpy).not.toHaveBeenCalled()
    })

    it("auto-accepts when bid >= minAcceptAmount", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        minAcceptAmount: 8000,
      } as never)
      const acceptSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 9000,
      })

      expect(acceptSpy).toHaveBeenCalledWith(BID_ID, SELLER_ID)
    })

    it("auto-rejects when bid < autoRejectBelow", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        autoRejectBelow: 5000,
      } as never)
      const rejectSpy = jest.spyOn(NegotiationService, "rejectBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 3000,
      })

      expect(rejectSpy).toHaveBeenCalledWith(BID_ID, SELLER_ID)
    })

    it("auto-counters when autoCounterEnabled is true", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        autoCounterEnabled: true,
      } as never)
      const counterSpy = jest.spyOn(NegotiationService, "counterBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 7000,
      })

      // Counter should be midpoint: (7000 + 10000) / 2 = 8500
      expect(counterSpy).toHaveBeenCalledWith(BID_ID, SELLER_ID, expect.objectContaining({ amount: 8500 }))
    })

    it("stops auto-negotiation when max rounds reached", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        autoCounterEnabled: true,
      } as never)
      jest.spyOn(db.bid, "count").mockResolvedValue(5 as never) // already at max
      const counterSpy = jest.spyOn(NegotiationService, "counterBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.placed", {
        bidId: BID_ID,
        threadId: THREAD_ID,
        listingId: LISTING_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        amount: 7000,
      })

      expect(counterSpy).not.toHaveBeenCalled()
    })
  })

  describe("bid.countered → buyer auto-respond", () => {
    const COUNTER_BID_ID = "bid-counter-1"

    beforeEach(() => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValue({
        id: THREAD_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        Listing: { price: 10000 },
        Bid: [{ agentId: "agent-seller-1" }], // counter was by an agent
      } as never)
    })

    it("does nothing when counter was placed by a human (agentId null)", async () => {
      jest.spyOn(db.negotiationThread, "findUnique").mockResolvedValue({
        id: THREAD_ID,
        buyerId: BUYER_ID,
        sellerId: SELLER_ID,
        Listing: { price: 10000 },
        Bid: [{ agentId: null }], // human counter
      } as never)
      jest.spyOn(db.agent, "findFirst").mockResolvedValue(null as never)
      const acceptSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.countered", {
        originalBidId: BID_ID,
        newBidId: COUNTER_BID_ID,
        threadId: THREAD_ID,
        amount: 9000,
      })

      expect(acceptSpy).not.toHaveBeenCalled()
    })

    it("auto-accepts counter when amount <= buyer minAcceptAmount", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        minAcceptAmount: 9500,
      } as never)
      const acceptSpy = jest.spyOn(NegotiationService, "acceptBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.countered", {
        originalBidId: BID_ID,
        newBidId: COUNTER_BID_ID,
        threadId: THREAD_ID,
        amount: 9000,
      })

      expect(acceptSpy).toHaveBeenCalledWith(COUNTER_BID_ID, BUYER_ID)
    })

    it("auto-counters back when counter exceeds maxBidAmount", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValue({
        ...BASE_AGENT,
        autoCounterEnabled: true,
        maxBidAmount: 8500,
      } as never)
      const counterSpy = jest.spyOn(NegotiationService, "counterBid").mockResolvedValue({} as never)

      await eventBus.emit("bid.countered", {
        originalBidId: BID_ID,
        newBidId: COUNTER_BID_ID,
        threadId: THREAD_ID,
        amount: 9500,
      })

      expect(counterSpy).toHaveBeenCalledWith(
        COUNTER_BID_ID,
        BUYER_ID,
        expect.objectContaining({ amount: 8500 })
      )
    })
  })
})
