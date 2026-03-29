import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { NotFoundError } from "@/lib/errors"
import { db } from "@/lib/db"
import { ListingService } from "@/domain/listings/service"
import { GET as searchListingsGET } from "@/app/api/agent/listings/search/route"
import { GET as getListingGET } from "@/app/api/agent/listings/[id]/route"

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

const mockAgent = {
  id: "agent-1",
  userId: "buyer-1",
  latitude: null,
  longitude: null,
}

const mockListingBase = {
  id: "listing-1",
  title: "Vintage Camera",
  description: "Excellent condition film camera from the 80s",
  labels: [],
  price: 15000,
  priceMax: null,
  currency: "USD",
  category: "ELECTRONICS",
  condition: "GOOD",
  address: "123 Main St, San Francisco",
  latitude: null,
  longitude: null,
  contactWhatsApp: null,
  contactTelegram: null,
  contactDiscord: null,
  agentId: null,
  confidence: null,
  status: "PUBLISHED",
  publishedAt: "2026-03-01T00:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
  pickupAvailable: true,
  deliveryAvailable: false,
  soldAt: null,
  ListingImage: [],
  User: { id: "user-1", name: "Alice" },
}

describe("buyer search and listing discovery", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: mockAgent,
    } as never)
  })

  // ─── Search endpoint ───────────────────────────────────────────────────────

  describe("GET /api/agent/listings/search", () => {
    it("returns listings with seed data", async () => {
      jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [mockListingBase],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.listings).toHaveLength(1)
      expect(body.data.listings[0].id).toBe("listing-1")
      expect(body.data.total).toBe(1)
    })

    it("returns empty list when no listings match", async () => {
      jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search?q=nonexistent", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.listings).toHaveLength(0)
      expect(body.data.total).toBe(0)
    })

    it("searches by keyword query parameter", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [mockListingBase],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search?q=camera", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ query: "camera" })
      )
    })

    it("filters by category parameter", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [mockListingBase],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?category=ELECTRONICS",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ category: "ELECTRONICS" })
      )
    })

    it("filters by price range", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [mockListingBase],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?minPrice=10000&maxPrice=20000",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 10000, maxPrice: 20000 })
      )
    })

    it("returns price and currency fields for correct formatting", async () => {
      jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [{ ...mockListingBase, price: 15000, currency: "USD" }],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      const body = await response.json()
      const listing = body.data.listings[0]

      // price is in cents: 15000 = $150.00
      expect(listing.price).toBe(15000)
      expect(listing.currency).toBe("USD")
    })

    it("supports pagination via hasMore and nextCursor", async () => {
      jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [mockListingBase],
        nextCursor: "cursor-abc",
        hasMore: true,
      } as never)

      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search?limit=1", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.hasMore).toBe(true)
      expect(body.data.nextCursor).toBe("cursor-abc")
    })

    it("passes cursor to search service for page 2", async () => {
      const page2Listing = { ...mockListingBase, id: "listing-2", title: "Page 2 Item" }
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [page2Listing],
        nextCursor: null,
        hasMore: false,
      } as never)

      const response = await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?cursor=cursor-abc&limit=1",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: "cursor-abc", limit: 1 })
      )
      expect(body.data.listings[0].id).toBe("listing-2")
      expect(body.data.hasMore).toBe(false)
      expect(body.data.nextCursor).toBeNull()
    })

    it("clamps limit to 100 maximum", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?limit=999",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      )
    })

    it("fetches page 2 with no overlap from page 1", async () => {
      const page1Listing = { ...mockListingBase, id: "listing-1" }
      const page2Listing = { ...mockListingBase, id: "listing-2", title: "Second Item" }
      const searchSpy = jest.spyOn(ListingService, "search")

      // Page 1
      searchSpy.mockResolvedValueOnce({
        items: [page1Listing],
        nextCursor: "listing-1",
        hasMore: true,
      } as never)

      const page1Response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search?limit=1", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )
      const page1Body = await page1Response.json()
      const cursor = page1Body.data.nextCursor

      // Page 2 using nextCursor from page 1
      searchSpy.mockResolvedValueOnce({
        items: [page2Listing],
        nextCursor: null,
        hasMore: false,
      } as never)

      const page2Response = await searchListingsGET(
        new NextRequest(
          `http://localhost/api/agent/listings/search?limit=1&cursor=${cursor}`,
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )
      const page2Body = await page2Response.json()

      expect(page1Body.data.listings[0].id).toBe("listing-1")
      expect(page2Body.data.listings[0].id).toBe("listing-2")
      // No overlap between pages
      const allIds = [
        ...page1Body.data.listings.map((l: { id: string }) => l.id),
        ...page2Body.data.listings.map((l: { id: string }) => l.id),
      ]
      expect(new Set(allIds).size).toBe(allIds.length)
    })

    it("passes sortBy=price_asc to search service", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?sortBy=price_asc",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "price_asc" })
      )
    })

    it("passes sortBy=price_desc to search service", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?sortBy=price_desc",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "price_desc" })
      )
    })

    it("defaults sortBy to newest when omitted", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search", {
          headers: { Authorization: "Bearer sk_test_abc" },
        })
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "newest" })
      )
    })

    it("falls back to newest for an unknown sortBy value", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?sortBy=invalid_sort",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "newest" })
      )
    })

    it("passes condition filter to search service", async () => {
      const searchSpy = jest.spyOn(ListingService, "search").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
      } as never)

      await searchListingsGET(
        new NextRequest(
          "http://localhost/api/agent/listings/search?condition=LIKE_NEW",
          { headers: { Authorization: "Bearer sk_test_abc" } }
        )
      )

      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ condition: "LIKE_NEW" })
      )
    })

    it("rejects unauthenticated requests with 401", async () => {
      const response = await searchListingsGET(
        new NextRequest("http://localhost/api/agent/listings/search")
      )

      expect(response.status).toBe(401)
    })

    it("fails fast when runtime bootstrap env is missing", async () => {
      const savedDb = process.env.DATABASE_URL
      const savedUrl = process.env.NEXTAUTH_URL
      const savedSecret = process.env.NEXTAUTH_SECRET

      delete process.env.DATABASE_URL
      delete process.env.NEXTAUTH_URL
      delete process.env.NEXTAUTH_SECRET

      try {
        const response = await searchListingsGET(
          new NextRequest("http://localhost/api/agent/listings/search", {
            headers: { Authorization: "Bearer sk_test_abc" },
          })
        )

        const body = await response.json()

        expect(response.status).toBe(503)
        expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
        expect(body.error.details.missingEnv).toEqual(
          expect.arrayContaining(["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"])
        )
      } finally {
        if (savedDb !== undefined) process.env.DATABASE_URL = savedDb
        if (savedUrl !== undefined) process.env.NEXTAUTH_URL = savedUrl
        if (savedSecret !== undefined) process.env.NEXTAUTH_SECRET = savedSecret
      }
    })
  })

  // ─── Listing detail endpoint ──────────────────────────────────────────────

  describe("GET /api/agent/listings/[id]", () => {
    it("returns all required listing fields", async () => {
      jest.spyOn(ListingService, "getById").mockResolvedValue({
        ...mockListingBase,
        Agent: null,
      } as never)

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-1", {
          headers: { Authorization: "Bearer sk_test_abc" },
        }),
        createContext("listing-1")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      const d = body.data
      expect(d.id).toBe("listing-1")
      expect(d.title).toBe("Vintage Camera")
      expect(d.description).toBe("Excellent condition film camera from the 80s")
      expect(d.price).toBe(15000)
      expect(d.currency).toBe("USD")
      expect(d.category).toBe("ELECTRONICS")
      expect(d.condition).toBe("GOOD")
      expect(d.address).toBe("123 Main St, San Francisco")
      expect(d.status).toBe("PUBLISHED")
      expect(d.pickupAvailable).toBe(true)
      expect(d.deliveryAvailable).toBe(false)
      expect(d.images).toBeDefined()
      expect(d.user).toBeDefined()
      expect(d.user.name).toBe("Alice")
    })

    it("returns 404 for a non-existent listing", async () => {
      jest.spyOn(ListingService, "getById").mockRejectedValue(
        new NotFoundError("Listing")
      )

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/missing", {
          headers: { Authorization: "Bearer sk_test_abc" },
        }),
        createContext("missing")
      )

      expect(response.status).toBe(404)
    })

    it("rejects unauthenticated requests with 401", async () => {
      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-1"),
        createContext("listing-1")
      )

      expect(response.status).toBe(401)
    })

    it("returns images array (empty when none)", async () => {
      jest.spyOn(ListingService, "getById").mockResolvedValue({
        ...mockListingBase,
        ListingImage: [],
        Agent: null,
      } as never)

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-1", {
          headers: { Authorization: "Bearer sk_test_abc" },
        }),
        createContext("listing-1")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.images).toEqual([])
    })

    it("returns images with url and order when present", async () => {
      jest.spyOn(ListingService, "getById").mockResolvedValue({
        ...mockListingBase,
        ListingImage: [
          { url: "https://example.com/photo1.jpg", order: 0 },
          { url: "https://example.com/photo2.jpg", order: 1 },
        ],
        Agent: null,
      } as never)

      const response = await getListingGET(
        new NextRequest("http://localhost/api/agent/listings/listing-1", {
          headers: { Authorization: "Bearer sk_test_abc" },
        }),
        createContext("listing-1")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.data.images).toHaveLength(2)
      expect(body.data.images[0]).toEqual({
        url: "https://example.com/photo1.jpg",
        order: 0,
      })
    })
  })
})
