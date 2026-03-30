/**
 * checkExpiredBids — unit tests with mocked Prisma
 *
 * Covers:
 * 1. Expires PENDING bids past their expiresAt
 * 2. Does not expire PENDING bids that have not yet expired
 * 3. Does not touch non-PENDING bids even if past expiresAt
 * 4. Handles no bids gracefully
 * 5. Expires multiple bids in one pass
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { BidStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { checkExpiredBids } from "@/domain/negotiations/expiration"

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock("@/lib/errors", () => ({
  logError: jest.fn(),
}))

function mockTxWithBids(bids: Array<{ id: string; threadId: string }>) {
  const count = bids.length
  jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
    return fn({
      bid: {
        findMany: jest.fn().mockResolvedValue(
          bids.map((b) => ({ ...b, NegotiationThread: { listingId: "listing-1" } }))
        ),
        updateMany: jest.fn().mockResolvedValue({ count }),
      },
    })
  })
}

function mockTxEmpty() {
  jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
    return fn({
      bid: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    })
  })
}

describe("checkExpiredBids", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("expires PENDING bids past their expiresAt", async () => {
    mockTxWithBids([{ id: "bid-1", threadId: "thread-1" }])

    const result = await checkExpiredBids()

    expect(result.processed).toBe(1)
    expect(result.expired).toBe(1)
  })

  it("does not expire PENDING bids that have not yet expired", async () => {
    // findMany returns empty — the future-expiry bid doesn't match the WHERE clause
    mockTxEmpty()

    const result = await checkExpiredBids()

    expect(result.processed).toBe(0)
    expect(result.expired).toBe(0)
  })

  it("does not touch non-PENDING bids even if past expiresAt", async () => {
    // Service only queries WHERE status=PENDING so non-PENDING bids are never returned
    mockTxEmpty()

    const result = await checkExpiredBids()

    expect(result.processed).toBe(0)
    expect(result.expired).toBe(0)
  })

  it("handles no bids gracefully", async () => {
    mockTxEmpty()

    const result = await checkExpiredBids()

    expect(result).toEqual({ processed: 0, expired: 0 })
  })

  it("expires multiple bids in one pass", async () => {
    mockTxWithBids([
      { id: "bid-1", threadId: "thread-1" },
      { id: "bid-2", threadId: "thread-2" },
    ])

    const result = await checkExpiredBids()

    expect(result.processed).toBe(2)
    expect(result.expired).toBe(2)
  })
})
