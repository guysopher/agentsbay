import { beforeEach, describe, expect, it } from "@jest/globals"
import {
  BidStatus,
  ItemCondition,
  ListingCategory,
  ListingStatus,
  ThreadStatus,
} from "@prisma/client"
import { randomUUID } from "crypto"
import { checkExpiredBids } from "@/domain/negotiations/expiration"
import { cleanDatabase, createTestUser, testDb } from "../../setup"

describe("checkExpiredBids", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  async function createFixture() {
    const buyer = await createTestUser({ email: `buyer-${Date.now()}@example.com` })
    const seller = await createTestUser({ email: `seller-${Date.now()}@example.com` })
    const now = new Date()

    const listing = await testDb.listing.create({
      data: {
        id: randomUUID(),
        userId: seller.id,
        title: "Test listing",
        description: "expiration test fixture",
        category: ListingCategory.HOME_GARDEN,
        condition: ItemCondition.GOOD,
        price: 5000,
        address: "Test City",
        status: ListingStatus.PUBLISHED,
        pickupAvailable: true,
        deliveryAvailable: false,
        publishedAt: now,
        updatedAt: now,
      },
    })

    const thread = await testDb.negotiationThread.create({
      data: {
        id: randomUUID(),
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        status: ThreadStatus.ACTIVE,
        updatedAt: now,
      },
    })

    return { buyer, seller, listing, thread }
  }

  it("expires PENDING bids past their expiresAt", async () => {
    const { thread } = await createFixture()
    const past = new Date(Date.now() - 1000)

    const bid = await testDb.bid.create({
      data: {
        id: randomUUID(),
        threadId: thread.id,
        amount: 4000,
        status: BidStatus.PENDING,
        expiresAt: past,
        updatedAt: new Date(),
      },
    })

    const result = await checkExpiredBids()

    expect(result.processed).toBe(1)
    expect(result.expired).toBe(1)

    const updated = await testDb.bid.findUnique({ where: { id: bid.id } })
    expect(updated?.status).toBe(BidStatus.EXPIRED)
  })

  it("does not expire PENDING bids that have not yet expired", async () => {
    const { thread } = await createFixture()
    const future = new Date(Date.now() + 60_000)

    const bid = await testDb.bid.create({
      data: {
        id: randomUUID(),
        threadId: thread.id,
        amount: 4000,
        status: BidStatus.PENDING,
        expiresAt: future,
        updatedAt: new Date(),
      },
    })

    const result = await checkExpiredBids()

    expect(result.processed).toBe(0)
    expect(result.expired).toBe(0)

    const unchanged = await testDb.bid.findUnique({ where: { id: bid.id } })
    expect(unchanged?.status).toBe(BidStatus.PENDING)
  })

  it("does not touch non-PENDING bids even if past expiresAt", async () => {
    const { thread } = await createFixture()
    const past = new Date(Date.now() - 1000)

    for (const status of [BidStatus.ACCEPTED, BidStatus.REJECTED, BidStatus.COUNTERED]) {
      await testDb.bid.create({
        data: {
          id: randomUUID(),
          threadId: thread.id,
          amount: 4000,
          status,
          expiresAt: past,
          updatedAt: new Date(),
        },
      })
    }

    const result = await checkExpiredBids()
    expect(result.processed).toBe(0)
    expect(result.expired).toBe(0)
  })

  it("handles no bids gracefully", async () => {
    const result = await checkExpiredBids()
    expect(result).toEqual({ processed: 0, expired: 0 })
  })

  it("expires multiple bids in one pass", async () => {
    const f1 = await createFixture()
    const f2 = await createFixture()
    const past = new Date(Date.now() - 1000)

    await testDb.bid.createMany({
      data: [
        {
          id: randomUUID(),
          threadId: f1.thread.id,
          amount: 4000,
          status: BidStatus.PENDING,
          expiresAt: past,
          updatedAt: new Date(),
        },
        {
          id: randomUUID(),
          threadId: f2.thread.id,
          amount: 3000,
          status: BidStatus.PENDING,
          expiresAt: past,
          updatedAt: new Date(),
        },
      ],
    })

    const result = await checkExpiredBids()
    expect(result.processed).toBe(2)
    expect(result.expired).toBe(2)
  })
})
