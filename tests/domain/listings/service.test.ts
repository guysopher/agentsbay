// Example test file for ListingService
import { describe, it, expect, beforeEach } from "@jest/globals"
import { ListingService } from "@/domain/listings/service"
import { testDb, cleanDatabase, createTestUser } from "../../setup"

describe("ListingService", () => {
  let testUser: any

  beforeEach(async () => {
    await cleanDatabase()
    testUser = await createTestUser()
  })

  describe("create", () => {
    it("should create a listing", async () => {
      const data = {
        title: "Office Chair",
        description: "Great condition office chair",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 12000,
        location: "San Francisco, CA",
      }

      const listing = await ListingService.create(testUser.id, data)

      expect(listing).toBeDefined()
      expect(listing.title).toBe(data.title)
      expect(listing.status).toBe("DRAFT")
      expect(listing.userId).toBe(testUser.id)
    })

    it("should create audit log entry", async () => {
      const data = {
        title: "Office Chair",
        description: "Great condition office chair",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 12000,
        location: "San Francisco, CA",
      }

      const listing = await ListingService.create(testUser.id, data)

      const auditLog = await testDb.auditLog.findFirst({
        where: {
          entityId: listing.id,
          action: "listing.created",
        },
      })

      expect(auditLog).toBeDefined()
      expect(auditLog?.userId).toBe(testUser.id)
    })
  })

  describe("publish", () => {
    it("should publish a draft listing", async () => {
      const data = {
        title: "Office Chair",
        description: "Great condition office chair",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 12000,
        location: "San Francisco, CA",
      }

      const listing = await ListingService.create(testUser.id, data)
      const published = await ListingService.publish(listing.id, testUser.id)

      expect(published.status).toBe("PUBLISHED")
      expect(published.publishedAt).toBeDefined()
    })

    it("should throw error for non-existent listing", async () => {
      await expect(
        ListingService.publish("non-existent-id", testUser.id)
      ).rejects.toThrow("Listing not found")
    })
  })

  describe("search", () => {
    it("should return published listings", async () => {
      // Create and publish a listing
      const data = {
        title: "Office Chair",
        description: "Great condition office chair",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 12000,
        location: "San Francisco, CA",
      }

      const listing = await ListingService.create(testUser.id, data)
      await ListingService.publish(listing.id, testUser.id)

      const results = await ListingService.search({})

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe(data.title)
    })

    it("should filter by category", async () => {
      // Create furniture listing
      const furniture = await ListingService.create(testUser.id, {
        title: "Chair",
        description: "A chair",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 10000,
        location: "SF",
      })
      await ListingService.publish(furniture.id, testUser.id)

      // Create electronics listing
      const electronics = await ListingService.create(testUser.id, {
        title: "Laptop",
        description: "A laptop",
        category: "ELECTRONICS" as const,
        condition: "GOOD" as const,
        price: 50000,
        location: "SF",
      })
      await ListingService.publish(electronics.id, testUser.id)

      const results = await ListingService.search({ category: "FURNITURE" })

      expect(results).toHaveLength(1)
      expect(results[0].category).toBe("FURNITURE")
    })

    it("should filter by price range", async () => {
      const listing1 = await ListingService.create(testUser.id, {
        title: "Cheap Item",
        description: "Cheap",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 5000, // $50
        location: "SF",
      })
      await ListingService.publish(listing1.id, testUser.id)

      const listing2 = await ListingService.create(testUser.id, {
        title: "Expensive Item",
        description: "Expensive",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 50000, // $500
        location: "SF",
      })
      await ListingService.publish(listing2.id, testUser.id)

      const results = await ListingService.search({
        minPrice: 10000,
        maxPrice: 60000,
      })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe("Expensive Item")
    })
  })
})
