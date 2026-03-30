/**
 * ListingService — unit tests with mocked Prisma
 *
 * Covers all lifecycle operations: create, publish, search, getById,
 * getUserListings, pause, relist, update, delete.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { ListingStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { ListingService } from "@/domain/listings/service"
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors"

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock("@/lib/geocoding", () => ({
  geocodeAddress: jest.fn().mockResolvedValue(null),
}))

jest.mock("@/lib/formatting", () => ({
  formatPrice: jest.fn((price: number) => `$${(price / 100).toFixed(2)}`),
}))

jest.mock("@/domain/trust/moderation", () => ({
  ModerationService: { checkAutoFlag: jest.fn().mockResolvedValue(undefined) },
}))

const USER_ID = "user-1"
const LISTING_ID = "listing-1"

function makeListing(overrides: Partial<{
  id: string; userId: string; status: ListingStatus; title: string
  price: number; currency: string; priceMax: null; category: string
  condition: string; publishedAt: Date | null; deletedAt: null
  labels: string[]; ListingImage: object[]; User: object; NegotiationThread: object[]
}> = {}) {
  return {
    id: LISTING_ID,
    userId: USER_ID,
    title: "Office Chair",
    description: "Great condition",
    category: "FURNITURE",
    condition: "GOOD",
    price: 12000,
    priceMax: null,
    currency: "USD",
    address: "San Francisco, CA",
    labels: [] as string[],
    status: ListingStatus.DRAFT,
    publishedAt: null,
    deletedAt: null,
    ListingImage: [],
    User: { id: USER_ID, name: "Test User" },
    NegotiationThread: [],
    ...overrides,
  }
}

// Helper: mock a $transaction that calls fn with a tx having listing.findFirst + listing.update + auditLog.create
function mockSimpleTx(
  findResult: object | null,
  updateResult: object,
  extraTxMethods: Record<string, object> = {}
) {
  jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
    return fn({
      listing: {
        findFirst: jest.fn().mockResolvedValue(findResult),
        update: jest.fn().mockResolvedValue(updateResult),
        create: jest.fn().mockResolvedValue(updateResult),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      ...extraTxMethods,
    })
  })
}

describe("ListingService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("should create a listing with DRAFT status", async () => {
      const createdListing = makeListing()
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          listing: { create: jest.fn().mockResolvedValue(createdListing) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const listing = await ListingService.create(USER_ID, {
        title: "Office Chair",
        description: "Great condition",
        category: "FURNITURE",
        condition: "GOOD",
        price: 12000,
        address: "San Francisco, CA",
      })

      expect(listing).toBeDefined()
      expect((listing as any).title).toBe("Office Chair")
      expect((listing as any).status).toBe(ListingStatus.DRAFT)
      expect((listing as any).userId).toBe(USER_ID)
    })

    it("should include formatted prices", async () => {
      const createdListing = makeListing()
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          listing: { create: jest.fn().mockResolvedValue(createdListing) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const listing = await ListingService.create(USER_ID, {
        title: "Office Chair",
        description: "Great condition",
        category: "FURNITURE",
        condition: "GOOD",
        price: 12000,
        address: "San Francisco, CA",
      })

      expect((listing as any).priceFormatted).toBeDefined()
    })
  })

  // ── duplicate detection ────────────────────────────────────────────────────

  describe("duplicate detection", () => {
    const baseInput = {
      title: "Office Chair",
      description: "Great condition",
      category: "FURNITURE",
      condition: "GOOD",
      price: 12000,
      address: "San Francisco, CA",
    }

    it("should reject an identical title posted by same seller within 24h", async () => {
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([
        { id: "existing-1", title: "Office Chair" },
      ] as never)

      await expect(
        ListingService.create(USER_ID, baseInput)
      ).rejects.toThrow(ConflictError)
    })

    it("should reject a near-identical title (>80% similarity)", async () => {
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([
        { id: "existing-1", title: "Office Chair" },
      ] as never)

      await expect(
        ListingService.create(USER_ID, { ...baseInput, title: "office chair" })
      ).rejects.toThrow(ConflictError)
    })

    it("should allow a sufficiently different title from same seller", async () => {
      const createdListing = makeListing({ title: "Standing Desk" })
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([
        { id: "existing-1", title: "Office Chair" },
      ] as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          listing: { create: jest.fn().mockResolvedValue(createdListing) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await ListingService.create(USER_ID, { ...baseInput, title: "Standing Desk" })

      expect((result as any).title).toBe("Standing Desk")
    })

    it("should allow creation when no recent listings exist", async () => {
      const createdListing = makeListing()
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          listing: { create: jest.fn().mockResolvedValue(createdListing) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await ListingService.create(USER_ID, baseInput)

      expect(result).toBeDefined()
    })

    it("should include the existing listing id in the conflict error message", async () => {
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([
        { id: "existing-abc", title: "Office Chair" },
      ] as never)

      await expect(
        ListingService.create(USER_ID, baseInput)
      ).rejects.toThrow("existing-abc")
    })
  })

  // ── publish ────────────────────────────────────────────────────────────────

  describe("publish", () => {
    it("should publish a draft listing", async () => {
      const draftListing = makeListing({ status: ListingStatus.DRAFT })
      const publishedListing = makeListing({ status: ListingStatus.PUBLISHED, publishedAt: new Date() })

      jest.spyOn(db.listing, "findFirst").mockResolvedValueOnce(draftListing as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          listing: { update: jest.fn().mockResolvedValue(publishedListing) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const published = await ListingService.publish(LISTING_ID, USER_ID)

      expect((published as any).status).toBe(ListingStatus.PUBLISHED)
      expect((published as any).publishedAt).toBeDefined()
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      jest.spyOn(db.listing, "findFirst").mockResolvedValue(null as never)

      await expect(ListingService.publish("non-existent-id", USER_ID)).rejects.toThrow(NotFoundError)
    })

    it("should throw ValidationError for non-draft listing", async () => {
      const published = makeListing({ status: ListingStatus.PUBLISHED })
      jest.spyOn(db.listing, "findFirst").mockResolvedValueOnce(published as never)

      await expect(ListingService.publish(LISTING_ID, USER_ID)).rejects.toThrow(ValidationError)
    })
  })

  // ── search ─────────────────────────────────────────────────────────────────

  describe("search", () => {
    it("should return published listings", async () => {
      const listing = makeListing({ status: ListingStatus.PUBLISHED })
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([listing] as never)

      const { items } = await ListingService.search({})

      expect(items).toHaveLength(1)
      expect((items[0] as any).title).toBe("Office Chair")
    })

    it("should filter by category (delegates to DB WHERE clause)", async () => {
      const listing = makeListing({ status: ListingStatus.PUBLISHED, category: "FURNITURE" })
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([listing] as never)

      const { items } = await ListingService.search({ category: "FURNITURE" })

      expect(items).toHaveLength(1)
      expect((items[0] as any).category).toBe("FURNITURE")
    })

    it("should filter by price range (delegates to DB WHERE clause)", async () => {
      const expensiveListing = makeListing({ status: ListingStatus.PUBLISHED, price: 50000, title: "Expensive Item" })
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([expensiveListing] as never)

      const { items } = await ListingService.search({ minPrice: 10000, maxPrice: 60000 })

      expect(items).toHaveLength(1)
      expect((items[0] as any).title).toBe("Expensive Item")
    })

    it("should return empty array when no matches", async () => {
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      const { items } = await ListingService.search({ category: "ELECTRONICS" })

      expect(items).toHaveLength(0)
    })

    it("should use AND word-split query for multi-word search", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({ query: "vintage camera" })

      const call = findManySpy.mock.calls[0][0] as { where: Record<string, unknown> }
      // Multi-word query uses AND across word conditions
      expect(call.where).toHaveProperty("AND")
      const andClause = call.where.AND as Array<{ OR: unknown[] }>
      expect(andClause).toHaveLength(2)
      // Each word condition is an OR across title/description
      expect(andClause[0]).toHaveProperty("OR")
      expect(andClause[1]).toHaveProperty("OR")
    })

    it("should use OR title/description for single-word search", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({ query: "camera" })

      const call = findManySpy.mock.calls[0][0] as { where: Record<string, unknown> }
      expect(call.where).toHaveProperty("OR")
      expect(call.where).not.toHaveProperty("AND")
    })

    it("should order by price ASC when sortBy=price_asc", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({ sortBy: "price_asc" })

      const call = findManySpy.mock.calls[0][0] as { orderBy: Record<string, unknown> }
      expect(call.orderBy).toEqual({ price: "asc" })
    })

    it("should order by price DESC when sortBy=price_desc", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({ sortBy: "price_desc" })

      const call = findManySpy.mock.calls[0][0] as { orderBy: Record<string, unknown> }
      expect(call.orderBy).toEqual({ price: "desc" })
    })

    it("should order by createdAt ASC when sortBy=oldest", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({ sortBy: "oldest" })

      const call = findManySpy.mock.calls[0][0] as { orderBy: Record<string, unknown> }
      expect(call.orderBy).toEqual({ createdAt: "asc" })
    })

    it("should order by createdAt DESC by default (newest)", async () => {
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      await ListingService.search({})

      const call = findManySpy.mock.calls[0][0] as { orderBy: Record<string, unknown> }
      expect(call.orderBy).toEqual({ createdAt: "desc" })
    })

    it("should promote title matches when sortBy=relevance", async () => {
      // titleMatch: query "camera" appears in title → high score
      const titleMatch = makeListing({
        id: "l-1",
        title: "camera for sale",
        description: "old item",
        status: ListingStatus.PUBLISHED,
      })
      // descMatch: query "camera" only in description → lower score
      const descMatch = makeListing({
        id: "l-2",
        title: "general stuff",
        description: "includes a camera",
        status: ListingStatus.PUBLISHED,
      })
      // DB returns descMatch first; relevance sort should promote titleMatch
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([descMatch, titleMatch] as never)

      const { items } = await ListingService.search({ query: "camera", sortBy: "relevance" })

      expect((items[0] as { id: string }).id).toBe("l-1")
    })

    it("should paginate: hasMore=true when results exceed limit", async () => {
      const listings = Array.from({ length: 6 }, (_, i) =>
        makeListing({ id: `l-${i}`, status: ListingStatus.PUBLISHED })
      )
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce(listings as never)

      const { items, hasMore, nextCursor } = await ListingService.search({ limit: 5 })

      expect(items).toHaveLength(5)
      expect(hasMore).toBe(true)
      expect(nextCursor).toBe("l-4")
    })
  })

  // ── getById ────────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("should get listing by ID", async () => {
      const listing = makeListing()
      jest.spyOn(db.listing, "findFirst").mockResolvedValueOnce(listing as never)

      const fetched = await ListingService.getById(LISTING_ID)

      expect((fetched as any).id).toBe(LISTING_ID)
      expect((fetched as any).title).toBe("Office Chair")
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      jest.spyOn(db.listing, "findFirst").mockResolvedValue(null as never)

      await expect(ListingService.getById("non-existent-id")).rejects.toThrow(NotFoundError)
    })
  })

  // ── getUserListings ────────────────────────────────────────────────────────

  describe("getUserListings", () => {
    it("should return user's listings as paginated result", async () => {
      const listing1 = makeListing({ id: "l-1", title: "Listing 1" })
      const listing2 = makeListing({ id: "l-2", title: "Listing 2" })
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([listing1, listing2] as never)

      const result = await ListingService.getUserListings(USER_ID)

      expect(result.items).toHaveLength(2)
      expect((result.items[0] as any).userId).toBe(USER_ID)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it("should return empty items for user with no listings", async () => {
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([] as never)

      const result = await ListingService.getUserListings(USER_ID)

      expect(result.items).toHaveLength(0)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it("should set hasMore and nextCursor when more pages exist", async () => {
      // Return limit+1 items to trigger hasMore
      const listings = Array.from({ length: 21 }, (_, i) =>
        makeListing({ id: `l-${i}`, title: `Listing ${i}` })
      )
      jest.spyOn(db.listing, "findMany").mockResolvedValueOnce(listings as never)

      const result = await ListingService.getUserListings(USER_ID, { limit: 20 })

      expect(result.items).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe("l-19")
    })

    it("should filter by status when provided", async () => {
      const published = makeListing({ id: "l-1", status: ListingStatus.PUBLISHED })
      const findManySpy = jest.spyOn(db.listing, "findMany").mockResolvedValueOnce([published] as never)

      const result = await ListingService.getUserListings(USER_ID, { status: ListingStatus.PUBLISHED })

      expect(result.items).toHaveLength(1)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ListingStatus.PUBLISHED }),
        })
      )
    })
  })

  // ── pause ──────────────────────────────────────────────────────────────────

  describe("pause", () => {
    it("should pause a published listing", async () => {
      const published = makeListing({ status: ListingStatus.PUBLISHED })
      const paused = makeListing({ status: ListingStatus.PAUSED })
      mockSimpleTx(published, paused)

      const result = await ListingService.pause(LISTING_ID, USER_ID)

      expect((result as any).status).toBe(ListingStatus.PAUSED)
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      mockSimpleTx(null, {})

      await expect(ListingService.pause("non-existent-id", USER_ID)).rejects.toThrow(NotFoundError)
    })

    it("should throw ValidationError when pausing a DRAFT listing", async () => {
      const draft = makeListing({ status: ListingStatus.DRAFT })
      mockSimpleTx(draft, {})

      await expect(ListingService.pause(LISTING_ID, USER_ID)).rejects.toThrow(
        "Cannot pause a listing with status DRAFT"
      )
    })

    it("should throw ValidationError when listing has active negotiations", async () => {
      const withActiveThread = makeListing({
        status: ListingStatus.PUBLISHED,
        NegotiationThread: [{ id: "thread-1" }],
      })
      mockSimpleTx(withActiveThread, {})

      await expect(ListingService.pause(LISTING_ID, USER_ID)).rejects.toThrow(
        "Cannot pause listing with active negotiations"
      )
    })

    it("should pause when all threads are completed or rejected", async () => {
      const published = makeListing({
        status: ListingStatus.PUBLISHED,
        NegotiationThread: [], // no ACTIVE threads
      })
      const paused = makeListing({ status: ListingStatus.PAUSED })
      mockSimpleTx(published, paused)

      const result = await ListingService.pause(LISTING_ID, USER_ID)

      expect((result as any).status).toBe(ListingStatus.PAUSED)
    })
  })

  // ── relist ─────────────────────────────────────────────────────────────────

  describe("relist", () => {
    it("should relist a paused listing", async () => {
      const paused = makeListing({ status: ListingStatus.PAUSED })
      const relisted = makeListing({ status: ListingStatus.PUBLISHED, publishedAt: new Date() })
      mockSimpleTx(paused, relisted)

      const result = await ListingService.relist(LISTING_ID, USER_ID)

      expect((result as any).status).toBe(ListingStatus.PUBLISHED)
      expect((result as any).publishedAt).toBeDefined()
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      mockSimpleTx(null, {})

      await expect(ListingService.relist("non-existent-id", USER_ID)).rejects.toThrow(NotFoundError)
    })

    it("should throw ValidationError when relisting a non-paused listing", async () => {
      const published = makeListing({ status: ListingStatus.PUBLISHED })
      mockSimpleTx(published, {})

      await expect(ListingService.relist(LISTING_ID, USER_ID)).rejects.toThrow(
        "Cannot relist a listing with status PUBLISHED"
      )
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("should update listing fields", async () => {
      const existing = makeListing({ status: ListingStatus.DRAFT })
      const updated = makeListing({ title: "Updated Title", price: 15000 })
      mockSimpleTx(existing, updated)

      const result = await ListingService.update(LISTING_ID, USER_ID, {
        title: "Updated Title",
        price: 15000,
      })

      expect((result as any).title).toBe("Updated Title")
      expect((result as any).price).toBe(15000)
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      mockSimpleTx(null, {})

      await expect(
        ListingService.update("non-existent-id", USER_ID, { title: "Test" })
      ).rejects.toThrow(NotFoundError)
    })

    it("should allow update on DRAFT listing", async () => {
      const draft = makeListing({ status: ListingStatus.DRAFT })
      const updated = makeListing({ title: "New Title" })
      mockSimpleTx(draft, updated)

      const result = await ListingService.update(LISTING_ID, USER_ID, { title: "New Title" })
      expect((result as any).title).toBe("New Title")
    })

    it("should allow update on PUBLISHED listing", async () => {
      const published = makeListing({ status: ListingStatus.PUBLISHED })
      const updated = makeListing({ title: "Updated Title", status: ListingStatus.PUBLISHED })
      mockSimpleTx(published, updated)

      const result = await ListingService.update(LISTING_ID, USER_ID, { title: "Updated Title" })
      expect((result as any).title).toBe("Updated Title")
    })

    it("should allow update on PAUSED listing", async () => {
      const paused = makeListing({ status: ListingStatus.PAUSED })
      const updated = makeListing({ title: "New Title", status: ListingStatus.PAUSED })
      mockSimpleTx(paused, updated)

      const result = await ListingService.update(LISTING_ID, USER_ID, { title: "New Title" })
      expect((result as any).title).toBe("New Title")
    })

    it("should throw ValidationError when editing a SOLD listing", async () => {
      const sold = makeListing({ status: ListingStatus.SOLD })
      mockSimpleTx(sold, {})

      await expect(
        ListingService.update(LISTING_ID, USER_ID, { title: "New Title" })
      ).rejects.toThrow("Cannot edit a listing with status SOLD")
    })

    it("should throw ValidationError when editing a RESERVED listing", async () => {
      const reserved = makeListing({ status: ListingStatus.RESERVED })
      mockSimpleTx(reserved, {})

      await expect(
        ListingService.update(LISTING_ID, USER_ID, { title: "New Title" })
      ).rejects.toThrow("Cannot edit a listing with status RESERVED")
    })

    it("should throw ValidationError when editing a FLAGGED listing", async () => {
      const flagged = makeListing({ status: ListingStatus.FLAGGED })
      mockSimpleTx(flagged, {})

      await expect(
        ListingService.update(LISTING_ID, USER_ID, { title: "New Title" })
      ).rejects.toThrow("Cannot edit a listing with status FLAGGED")
    })
  })

  // ── delete ─────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("should soft delete a DRAFT listing", async () => {
      const draft = makeListing({ status: ListingStatus.DRAFT, publishedAt: null })
      const deleted = makeListing({ status: ListingStatus.REMOVED, deletedAt: null })
      mockSimpleTx(draft, { ...deleted, deletedAt: new Date() })

      const result = await ListingService.delete(LISTING_ID, USER_ID)

      expect((result as any).status).toBe(ListingStatus.REMOVED)
    })

    it("should soft delete a PAUSED listing", async () => {
      const paused = makeListing({ status: ListingStatus.PAUSED })
      const deleted = makeListing({ status: ListingStatus.REMOVED })
      mockSimpleTx(paused, { ...deleted, deletedAt: new Date() })

      const result = await ListingService.delete(LISTING_ID, USER_ID)

      expect((result as any).status).toBe(ListingStatus.REMOVED)
      expect((result as any).deletedAt).toBeDefined()
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      mockSimpleTx(null, {})

      await expect(
        ListingService.delete("non-existent-id", USER_ID)
      ).rejects.toThrow(NotFoundError)
    })

    it("should throw ValidationError when deleting a SOLD listing", async () => {
      const sold = makeListing({ status: ListingStatus.SOLD })
      mockSimpleTx(sold, {})

      await expect(
        ListingService.delete(LISTING_ID, USER_ID)
      ).rejects.toThrow("Cannot delete a listing with status SOLD")
    })

    it("should throw ValidationError when deleting a RESERVED listing", async () => {
      const reserved = makeListing({ status: ListingStatus.RESERVED })
      mockSimpleTx(reserved, {})

      await expect(
        ListingService.delete(LISTING_ID, USER_ID)
      ).rejects.toThrow("Cannot delete a listing with status RESERVED")
    })

    it("should throw ValidationError when deleting a REMOVED listing", async () => {
      const removed = makeListing({ status: ListingStatus.REMOVED })
      mockSimpleTx(removed, {})

      await expect(
        ListingService.delete(LISTING_ID, USER_ID)
      ).rejects.toThrow("Cannot delete a listing with status REMOVED")
    })

    it("should throw ValidationError when listing has active bids", async () => {
      const withActiveThread = makeListing({
        status: ListingStatus.PUBLISHED,
        NegotiationThread: [{ id: "thread-1" }],
      })
      mockSimpleTx(withActiveThread, {})

      await expect(
        ListingService.delete(LISTING_ID, USER_ID)
      ).rejects.toThrow("Cannot delete listing with active bids")
    })
  })
})
