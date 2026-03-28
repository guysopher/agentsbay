/**
 * E2E tests: Seller listing creation and management flow (AGE-6)
 *
 * Covers:
 * 1. Validation schema — all required fields, price format, address rules
 * 2. POST /api/agent/listings — successful creation + auto-publish
 * 3. GET /api/agent/listings/search — created listing appears in browse results
 * 4. GET /api/agent/listings/[id] — details match what was submitted
 * 5. Auth guards on every route
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ListingService } from "@/domain/listings/service"
import { POST as createListingPOST } from "@/app/api/agent/listings/route"
import { GET as getListingGET, PATCH as patchListingPATCH, DELETE as deleteListingDELETE } from "@/app/api/agent/listings/[id]/route"
import { GET as searchListingsGET } from "@/app/api/agent/listings/search/route"
import { POST as publishListingPOST } from "@/app/api/agent/listings/[id]/publish/route"
import { POST as pauseListingPOST } from "@/app/api/agent/listings/[id]/pause/route"
import { POST as relistListingPOST } from "@/app/api/agent/listings/[id]/relist/route"
import { ValidationError, NotFoundError } from "@/lib/errors"

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

const VALID_LISTING_PAYLOAD = {
  title: "Vintage Office Chair",
  description: "Excellent condition, ergonomic, barely used",
  category: "FURNITURE",
  condition: "GOOD",
  price: 12000, // $120.00 in cents
  address: "123 Main Street, Tel Aviv, Israel",
  pickupAvailable: true,
  deliveryAvailable: false,
}

const MOCK_AGENT = {
  id: "agent-seller-1",
  userId: "user-seller-1",
  isActive: true,
  deletedAt: null,
  name: "Seller Agent",
  latitude: null,
  longitude: null,
  autoNegotiate: false,
  requireApproval: true,
}

const MOCK_PUBLISHED_LISTING = {
  id: "listing-abc-123",
  userId: "user-seller-1",
  agentId: "agent-seller-1",
  title: "Vintage Office Chair",
  description: "Excellent condition, ergonomic, barely used",
  labels: [],
  category: "FURNITURE",
  condition: "GOOD",
  price: 12000,
  priceMax: null,
  priceFormatted: "$120.00",
  priceMaxFormatted: null,
  currency: "USD",
  address: "123 Main Street, Tel Aviv, Israel",
  latitude: 32.08,
  longitude: 34.78,
  contactWhatsApp: null,
  contactTelegram: null,
  contactDiscord: null,
  confidence: null,
  status: "PUBLISHED",
  pickupAvailable: true,
  deliveryAvailable: false,
  publishedAt: new Date("2026-03-28T10:00:00.000Z"),
  soldAt: null,
  createdAt: new Date("2026-03-28T10:00:00.000Z"),
  updatedAt: new Date("2026-03-28T10:00:00.000Z"),
  ListingImage: [],
  User: { id: "user-seller-1", name: "Test Seller" },
}

describe("seller listing API routes (AGE-6)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
  })

  // ─── Runtime bootstrap guard ─────────────────────────────────────────────────

  it("returns 503 with SERVICE_UNAVAILABLE when runtime env is missing", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    const originalNextAuthUrl = process.env.NEXTAUTH_URL
    const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    try {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(VALID_LISTING_PAYLOAD),
        })
      )

      const body = await response.json()
      expect(response.status).toBe(503)
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
      expect(body.error.details.missingEnv).toEqual(
        expect.arrayContaining(["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"])
      )
    } finally {
      if (originalDatabaseUrl !== undefined) process.env.DATABASE_URL = originalDatabaseUrl
      if (originalNextAuthUrl !== undefined) process.env.NEXTAUTH_URL = originalNextAuthUrl
      if (originalNextAuthSecret !== undefined) process.env.NEXTAUTH_SECRET = originalNextAuthSecret
    }
  })

  // ─── Auth guards ─────────────────────────────────────────────────────────────

  describe("auth guards", () => {
    it("rejects listing creation with no Authorization header", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(VALID_LISTING_PAYLOAD),
        })
      )
      expect(response.status).toBe(401)
    })

    it("rejects listing creation with invalid API key", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(null as never)

      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_INVALID",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(VALID_LISTING_PAYLOAD),
        })
      )
      expect(response.status).toBe(401)
    })

    it("rejects GET listing with no Authorization header", async () => {
      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-1", {
          method: "GET",
        }),
        createContext("listing-1")
      )
      expect(response.status).toBe(401)
    })
  })

  // ─── Validation — required fields ────────────────────────────────────────────

  describe("listing creation — input validation", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("rejects creation when title is missing", async () => {
      const payload = { ...VALID_LISTING_PAYLOAD }
      delete (payload as Record<string, unknown>).title

      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      )
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("rejects creation when description is too short", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...VALID_LISTING_PAYLOAD, description: "Short" }),
        })
      )
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("rejects creation when price is zero", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...VALID_LISTING_PAYLOAD, price: 0 }),
        })
      )
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("rejects creation when price is negative", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...VALID_LISTING_PAYLOAD, price: -500 }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("rejects creation when category is invalid", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...VALID_LISTING_PAYLOAD, category: "INVALID_CATEGORY" }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("rejects creation when condition is invalid", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...VALID_LISTING_PAYLOAD, condition: "WORN_OUT" }),
        })
      )
      expect(response.status).toBe(400)
    })

    it("rejects address containing apartment number (privacy rule)", async () => {
      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...VALID_LISTING_PAYLOAD,
            address: "123 Main Street, Apt 4B, Tel Aviv, Israel",
          }),
        })
      )
      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })

  // ─── Successful listing creation ──────────────────────────────────────────────

  describe("listing creation — success path", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("creates and auto-publishes listing, returning correct fields", async () => {
      const createSpy = jest.spyOn(ListingService, "create").mockResolvedValue(
        { ...MOCK_PUBLISHED_LISTING, status: "DRAFT" } as never
      )
      const publishSpy = jest.spyOn(ListingService, "publish").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      const response = await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(VALID_LISTING_PAYLOAD),
        })
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(publishSpy).toHaveBeenCalledTimes(1)

      // Verify response contains required fields
      expect(body.data.id).toBe("listing-abc-123")
      expect(body.data.status).toBe("PUBLISHED")
      expect(body.data.publishedAt).toBeDefined()
      expect(body.data.agentId).toBe("agent-seller-1")
      expect(body.data.listing.title).toBe("Vintage Office Chair")
      expect(body.data.listing.price).toBe(12000)
      expect(body.data.listing.category).toBe("FURNITURE")
      expect(body.data.listing.condition).toBe("GOOD")
      expect(body.data.listing.address).toBe("123 Main Street, Tel Aviv, Israel")
    })

    it("passes correct userId and agentId to ListingService.create", async () => {
      const createSpy = jest.spyOn(ListingService, "create").mockResolvedValue(
        { ...MOCK_PUBLISHED_LISTING, status: "DRAFT" } as never
      )
      jest.spyOn(ListingService, "publish").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      await createListingPOST(
        new NextRequest("http://localhost/api/agent/listings", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(VALID_LISTING_PAYLOAD),
        })
      )

      expect(createSpy).toHaveBeenCalledWith(
        "user-seller-1",
        expect.objectContaining({ title: "Vintage Office Chair" }),
        "agent-seller-1"
      )
    })
  })

  // ─── Created listing appears in browse/search ────────────────────────────────

  describe("search — listing appears after creation", () => {
    it("returns published listing in search results", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [MOCK_PUBLISHED_LISTING],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search", {
          method: "GET",
          headers: { Authorization: "Bearer sk_test_123" },
        })
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(searchSpy).toHaveBeenCalledTimes(1)
      expect(body.data.listings).toHaveLength(1)
      expect(body.data.listings[0].id).toBe("listing-abc-123")
      expect(body.data.listings[0].title).toBe("Vintage Office Chair")
      expect(body.data.listings[0].status).toBe("PUBLISHED")
    })

    it("filters by category correctly", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?category=ELECTRONICS",
          {
            method: "GET",
            headers: { Authorization: "Bearer sk_test_123" },
          }
        )
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: "ELECTRONICS" })
      )
      expect(body.data.listings).toHaveLength(0)
    })

    it("filters by price range correctly", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [MOCK_PUBLISHED_LISTING],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?minPrice=5000&maxPrice=20000",
          {
            method: "GET",
            headers: { Authorization: "Bearer sk_test_123" },
          }
        )
      )

      expect(response.status).toBe(200)
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 5000, maxPrice: 20000 })
      )
    })
  })

  // ─── Listing details match submitted data ────────────────────────────────────

  describe("GET listing — details match submitted data", () => {
    it("returns full listing details matching what was created", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
      const getByIdSpy = jest.spyOn(ListingService, "getById").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "GET",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(getByIdSpy).toHaveBeenCalledWith("listing-abc-123")

      // All submitted fields must round-trip correctly
      expect(body.data.id).toBe("listing-abc-123")
      expect(body.data.title).toBe("Vintage Office Chair")
      expect(body.data.description).toBe("Excellent condition, ergonomic, barely used")
      expect(body.data.category).toBe("FURNITURE")
      expect(body.data.condition).toBe("GOOD")
      expect(body.data.price).toBe(12000)
      expect(body.data.address).toBe("123 Main Street, Tel Aviv, Israel")
      expect(body.data.pickupAvailable).toBe(true)
      expect(body.data.deliveryAvailable).toBe(false)
      expect(body.data.status).toBe("PUBLISHED")
      expect(body.data.agentId).toBe("agent-seller-1")
      expect(body.data.images).toEqual([])
      expect(body.data.user.name).toBe("Test Seller")
    })

    it("returns 404 for non-existent listing", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
      jest.spyOn(ListingService, "getById").mockRejectedValue(
        new Error("Listing not found")
      )

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/does-not-exist", {
          method: "GET",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("does-not-exist")
      )

      expect(response.status).toBe(404)
    })
  })

  // ─── Publish route ────────────────────────────────────────────────────────────

  describe("publish listing", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("publishes a draft listing successfully", async () => {
      const publishSpy = jest.spyOn(ListingService, "publish").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      const response = await publishListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/publish", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(publishSpy).toHaveBeenCalledWith("listing-abc-123", "user-seller-1")
      expect(body.data.status).toBe("PUBLISHED")
      expect(body.data.publishedAt).toBeDefined()
      expect(body.data.title).toBe("Vintage Office Chair")
    })

    it("returns 404 when publishing non-existent listing", async () => {
      jest.spyOn(ListingService, "publish").mockRejectedValue(
        new Error("Listing not found")
      )

      const response = await publishListingPOST(
        new NextRequest("http://localhost/api/agent/listings/bad-id/publish", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("bad-id")
      )

      expect(response.status).toBe(404)
    })

    it("rejects publish without auth", async () => {
      const response = await publishListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/publish", {
          method: "POST",
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(401)
    })
  })

  // ─── PATCH /api/agent/listings/[id] ───────────────────────────────────────────

  describe("PATCH listing", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("returns 401 without auth", async () => {
      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated Title" }),
        }),
        createContext("listing-abc-123")
      )
      expect(response.status).toBe(401)
    })

    it("returns 200 with updated listing on success", async () => {
      const updatedListing = { ...MOCK_PUBLISHED_LISTING, title: "Updated Title" }
      jest.spyOn(ListingService, "update").mockResolvedValue(updatedListing as never)

      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "Updated Title" }),
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.data.title).toBe("Updated Title")
      expect(body.meta.timestamp).toBeDefined()
    })

    it("passes correct userId and listingId to ListingService.update", async () => {
      const updateSpy = jest.spyOn(ListingService, "update").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "New Title" }),
        }),
        createContext("listing-abc-123")
      )

      expect(updateSpy).toHaveBeenCalledWith(
        "listing-abc-123",
        "user-seller-1",
        expect.objectContaining({ title: "New Title" })
      )
    })

    it("returns 400 on invalid request body (Zod validation)", async () => {
      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ price: -100 }),
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(400)
    })

    it("returns 400 when status guard rejects the edit", async () => {
      jest.spyOn(ListingService, "update").mockRejectedValue(
        new ValidationError("Cannot edit a listing with status SOLD")
      )

      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "New Title" }),
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("returns 404 for non-existent listing", async () => {
      jest.spyOn(ListingService, "update").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/does-not-exist", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "New Title" }),
        }),
        createContext("does-not-exist")
      )

      expect(response.status).toBe(404)
    })
  })

  // ─── DELETE /api/agent/listings/[id] ─────────────────────────────────────────

  describe("DELETE listing", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("returns 401 without auth", async () => {
      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
        }),
        createContext("listing-abc-123")
      )
      expect(response.status).toBe(401)
    })

    it("returns 200 with id, status REMOVED, and deletedAt on success", async () => {
      const deletedAt = new Date("2026-03-28T12:00:00.000Z")
      jest.spyOn(ListingService, "delete").mockResolvedValue({
        ...MOCK_PUBLISHED_LISTING,
        status: "REMOVED",
        deletedAt,
      } as never)

      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.data.id).toBe("listing-abc-123")
      expect(body.data.status).toBe("REMOVED")
      expect(body.data.deletedAt).toBeDefined()
      expect(body.meta.timestamp).toBeDefined()
    })

    it("passes correct userId and listingId to ListingService.delete", async () => {
      const deleteSpy = jest.spyOn(ListingService, "delete").mockResolvedValue({
        ...MOCK_PUBLISHED_LISTING,
        status: "REMOVED",
        deletedAt: new Date(),
      } as never)

      await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(deleteSpy).toHaveBeenCalledWith("listing-abc-123", "user-seller-1")
    })

    it("returns 400 when listing has active bids", async () => {
      jest.spyOn(ListingService, "delete").mockRejectedValue(
        new ValidationError("Cannot delete listing with active bids")
      )

      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("returns 400 when listing status is SOLD", async () => {
      jest.spyOn(ListingService, "delete").mockRejectedValue(
        new ValidationError("Cannot delete a listing with status SOLD")
      )

      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(400)
    })

    it("returns 404 for non-existent listing", async () => {
      jest.spyOn(ListingService, "delete").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/does-not-exist", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("does-not-exist")
      )

      expect(response.status).toBe(404)
    })
  })

  // ─── POST /api/agent/listings/[id]/pause ─────────────────────────────────────

  describe("POST pause listing", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("returns 401 without auth", async () => {
      const response = await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/pause", {
          method: "POST",
        }),
        createContext("listing-abc-123")
      )
      expect(response.status).toBe(401)
    })

    it("returns 200 with PAUSED listing on success", async () => {
      const pausedListing = { ...MOCK_PUBLISHED_LISTING, status: "PAUSED" }
      jest.spyOn(ListingService, "pause").mockResolvedValue(pausedListing as never)

      const response = await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/pause", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.data.status).toBe("PAUSED")
      expect(body.meta.timestamp).toBeDefined()
    })

    it("passes correct userId and listingId to ListingService.pause", async () => {
      const pauseSpy = jest.spyOn(ListingService, "pause").mockResolvedValue(
        { ...MOCK_PUBLISHED_LISTING, status: "PAUSED" } as never
      )

      await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/pause", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(pauseSpy).toHaveBeenCalledWith("listing-abc-123", "user-seller-1")
    })

    it("returns 400 when listing is not PUBLISHED", async () => {
      jest.spyOn(ListingService, "pause").mockRejectedValue(
        new ValidationError("Cannot pause a listing with status DRAFT")
      )

      const response = await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/pause", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("returns 404 for non-existent listing", async () => {
      jest.spyOn(ListingService, "pause").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/does-not-exist/pause", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("does-not-exist")
      )

      expect(response.status).toBe(404)
    })
  })

  // ─── POST /api/agent/listings/[id]/relist ────────────────────────────────────

  describe("POST relist listing", () => {
    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT,
      } as never)
    })

    it("returns 401 without auth", async () => {
      const response = await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/relist", {
          method: "POST",
        }),
        createContext("listing-abc-123")
      )
      expect(response.status).toBe(401)
    })

    it("returns 200 with PUBLISHED listing and updated publishedAt on success", async () => {
      const newPublishedAt = new Date("2026-03-28T14:00:00.000Z")
      const relistedListing = { ...MOCK_PUBLISHED_LISTING, status: "PUBLISHED", publishedAt: newPublishedAt }
      jest.spyOn(ListingService, "relist").mockResolvedValue(relistedListing as never)

      const response = await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/relist", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.data.status).toBe("PUBLISHED")
      expect(body.data.publishedAt).toBeDefined()
      expect(body.meta.timestamp).toBeDefined()
    })

    it("passes correct userId and listingId to ListingService.relist", async () => {
      const relistSpy = jest.spyOn(ListingService, "relist").mockResolvedValue(
        MOCK_PUBLISHED_LISTING as never
      )

      await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/relist", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(relistSpy).toHaveBeenCalledWith("listing-abc-123", "user-seller-1")
    })

    it("returns 400 when listing is not PAUSED", async () => {
      jest.spyOn(ListingService, "relist").mockRejectedValue(
        new ValidationError("Cannot relist a listing with status PUBLISHED")
      )

      const response = await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/relist", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      const body = await response.json()
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("returns 404 for non-existent listing", async () => {
      jest.spyOn(ListingService, "relist").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/does-not-exist/relist", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("does-not-exist")
      )

      expect(response.status).toBe(404)
    })
  })

  // ─── Ownership enforcement ────────────────────────────────────────────────────

  describe("ownership enforcement — seller cannot modify another seller's listing", () => {
    const MOCK_AGENT_SELLER_B = {
      ...MOCK_AGENT,
      id: "agent-seller-2",
      userId: "user-seller-2",
      name: "Seller B Agent",
    }

    beforeEach(() => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
        Agent: MOCK_AGENT_SELLER_B,
      } as never)
    })

    it("returns 404 when seller B tries to PATCH seller A's listing", async () => {
      jest.spyOn(ListingService, "update").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await patchListingPATCH(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "PATCH",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: "Hijacked Title" }),
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(404)
    })

    it("returns 404 when seller B tries to DELETE seller A's listing", async () => {
      jest.spyOn(ListingService, "delete").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await deleteListingDELETE(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123", {
          method: "DELETE",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(404)
    })

    it("returns 404 when seller B tries to pause seller A's listing", async () => {
      jest.spyOn(ListingService, "pause").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await pauseListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/pause", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(404)
    })

    it("returns 404 when seller B tries to relist seller A's listing", async () => {
      jest.spyOn(ListingService, "relist").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await relistListingPOST(
        new NextRequest("http://localhost/api/agent/listings/listing-abc-123/relist", {
          method: "POST",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("listing-abc-123")
      )

      expect(response.status).toBe(404)
    })
  })
})
