import { beforeEach, describe, expect, it } from "@jest/globals"
import {
  BidStatus,
  ItemCondition,
  ListingCategory,
  ListingStatus,
  ThreadStatus,
} from "@prisma/client"
import { randomUUID } from "crypto"
import { NegotiationService } from "@/domain/negotiations/service"
import { cleanDatabase, createTestUser, testDb } from "../../setup"

describe("NegotiationService", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  async function createListingFixture() {
    const buyer = await createTestUser({ email: `buyer-${Date.now()}@example.com` })
    const seller = await createTestUser({ email: `seller-${Date.now()}@example.com` })
    const now = new Date()

    const listing = await testDb.listing.create({
      data: {
        id: randomUUID(),
        userId: seller.id,
        title: "Vintage desk lamp",
        description: "A clean fixture for negotiation tests",
        category: ListingCategory.HOME_GARDEN,
        condition: ItemCondition.GOOD,
        price: 10000,
        address: "Test City",
        status: ListingStatus.PUBLISHED,
        pickupAvailable: true,
        deliveryAvailable: false,
        publishedAt: now,
        updatedAt: now,
      },
    })

    return { buyer, seller, listing }
  }

  it("places a bid and creates a negotiation thread", async () => {
    const { buyer, listing } = await createListingFixture()

    const result = await NegotiationService.placeBid({
      listingId: listing.id,
      buyerId: buyer.id,
      amount: 8500,
      message: "Would you take $85?",
    })

    expect(result.thread.listingId).toBe(listing.id)
    expect(result.thread.buyerId).toBe(buyer.id)
    expect(result.thread.status).toBe(ThreadStatus.ACTIVE)
    expect(result.bid.status).toBe(BidStatus.PENDING)
    expect(result.bid.message).toBe("Would you take $85?")
  })

  it("counters a pending bid and marks the original as countered", async () => {
    const { buyer, seller, listing } = await createListingFixture()
    const placed = await NegotiationService.placeBid({
      listingId: listing.id,
      buyerId: buyer.id,
      amount: 8500,
    })

    const counter = await NegotiationService.counterBid(placed.bid.id, seller.id, {
      amount: 9000,
      message: "Can you do $90?",
    })

    const original = await testDb.bid.findUnique({ where: { id: placed.bid.id } })

    expect(original?.status).toBe(BidStatus.COUNTERED)
    expect(counter.status).toBe(BidStatus.PENDING)
    expect(counter.amount).toBe(9000)
    expect(counter.threadId).toBe(placed.thread.id)
  })

  it("accepts a bid, reserves the listing, and creates an order", async () => {
    const { buyer, seller, listing } = await createListingFixture()
    const placed = await NegotiationService.placeBid({
      listingId: listing.id,
      buyerId: buyer.id,
      amount: 9200,
    })

    const accepted = await NegotiationService.acceptBid(placed.bid.id, seller.id)
    const updatedListing = await testDb.listing.findUnique({ where: { id: listing.id } })
    const updatedThread = await testDb.negotiationThread.findUnique({
      where: { id: placed.thread.id },
    })

    expect(accepted.bid.status).toBe(BidStatus.ACCEPTED)
    expect(accepted.order.threadId).toBe(placed.thread.id)
    expect(accepted.order.listingId).toBe(listing.id)
    expect(updatedListing?.status).toBe(ListingStatus.RESERVED)
    expect(updatedThread?.status).toBe(ThreadStatus.ACCEPTED)
    expect(accepted.order.buyerId).toBe(buyer.id)
  })
})
