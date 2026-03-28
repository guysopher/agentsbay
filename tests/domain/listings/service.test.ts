// Example test file for ListingService
import { describe, it, expect, beforeEach } from "@jest/globals"
import { ListingService } from "@/domain/listings/service"
import { testDb, cleanDatabase, createTestUser, createTestListing } from "../../setup"
import { randomUUID } from "crypto"

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

      const { items: results } = await ListingService.search({})

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

      const { items: results } = await ListingService.search({ category: "FURNITURE" })

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

      const { items: results } = await ListingService.search({
        minPrice: 10000,
        maxPrice: 60000,
      })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe("Expensive Item")
    })
  })

  describe("getById", () => {
    it("should get listing by ID", async () => {
      const data = {
        title: "Test Listing",
        description: "Test description",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 10000,
        address: "Test Address",
      }

      const created = await ListingService.create(testUser.id, data)
      const fetched = await ListingService.getById(created.id)

      expect(fetched).toBeDefined()
      expect(fetched.id).toBe(created.id)
      expect(fetched.title).toBe(data.title)
    })

    it("should throw error for non-existent listing", async () => {
      await expect(
        ListingService.getById("non-existent-id")
      ).rejects.toThrow("Listing not found")
    })
  })

  describe("getUserListings", () => {
    it("should return user's listings", async () => {
      // Create two listings for test user
      await ListingService.create(testUser.id, {
        title: "Listing 1",
        description: "Description 1",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 10000,
        address: "Address 1",
      })

      await ListingService.create(testUser.id, {
        title: "Listing 2",
        description: "Description 2",
        category: "ELECTRONICS" as const,
        condition: "LIKE_NEW" as const,
        price: 20000,
        address: "Address 2",
      })

      const listings = await ListingService.getUserListings(testUser.id)

      expect(listings).toHaveLength(2)
      expect(listings[0].userId).toBe(testUser.id)
      expect(listings[1].userId).toBe(testUser.id)
    })

    it("should return empty array for user with no listings", async () => {
      const listings = await ListingService.getUserListings(testUser.id)
      expect(listings).toHaveLength(0)
    })
  })

  describe("pause", () => {
    it("should pause a published listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "PUBLISHED" })
      const paused = await ListingService.pause(listing.id, testUser.id)

      expect(paused.status).toBe("PAUSED")
    })

    it("should create audit log entry for pause", async () => {
      const listing = await createTestListing(testUser.id, { status: "PUBLISHED" })
      await ListingService.pause(listing.id, testUser.id)

      const log = await testDb.auditLog.findFirst({
        where: { entityId: listing.id, action: "listing.paused" },
      })
      expect(log).toBeDefined()
      expect(log?.userId).toBe(testUser.id)
    })

    it("should throw ValidationError when pausing a non-published listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "DRAFT" })

      await expect(
        ListingService.pause(listing.id, testUser.id)
      ).rejects.toThrow("Cannot pause a listing with status DRAFT")
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      await expect(
        ListingService.pause("non-existent-id", testUser.id)
      ).rejects.toThrow("Listing not found")
    })

    it("should throw NotFoundError when user does not own the listing", async () => {
      const otherUser = await createTestUser({ email: "other@example.com" })
      const listing = await createTestListing(otherUser.id, { status: "PUBLISHED" })

      await expect(
        ListingService.pause(listing.id, testUser.id)
      ).rejects.toThrow("Listing not found")
    })
  })

  describe("relist", () => {
    it("should relist a paused listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "PAUSED" })
      const relisted = await ListingService.relist(listing.id, testUser.id)

      expect(relisted.status).toBe("PUBLISHED")
      expect(relisted.publishedAt).toBeDefined()
    })

    it("should create audit log entry for relist", async () => {
      const listing = await createTestListing(testUser.id, { status: "PAUSED" })
      await ListingService.relist(listing.id, testUser.id)

      const log = await testDb.auditLog.findFirst({
        where: { entityId: listing.id, action: "listing.relisted" },
      })
      expect(log).toBeDefined()
      expect(log?.userId).toBe(testUser.id)
    })

    it("should throw ValidationError when relisting a non-paused listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "PUBLISHED" })

      await expect(
        ListingService.relist(listing.id, testUser.id)
      ).rejects.toThrow("Cannot relist a listing with status PUBLISHED")
    })

    it("should throw NotFoundError for non-existent listing", async () => {
      await expect(
        ListingService.relist("non-existent-id", testUser.id)
      ).rejects.toThrow("Listing not found")
    })

    it("should throw NotFoundError when user does not own the listing", async () => {
      const otherUser = await createTestUser({ email: "other2@example.com" })
      const listing = await createTestListing(otherUser.id, { status: "PAUSED" })

      await expect(
        ListingService.relist(listing.id, testUser.id)
      ).rejects.toThrow("Listing not found")
    })
  })

  describe("update", () => {
    it("should update listing fields", async () => {
      const created = await ListingService.create(testUser.id, {
        title: "Original Title",
        description: "Original description",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 10000,
        address: "Original Address",
      })

      const updated = await ListingService.update(created.id, testUser.id, {
        title: "Updated Title",
        price: 15000,
      })

      expect(updated.title).toBe("Updated Title")
      expect(updated.price).toBe(15000)
      expect(updated.description).toBe("Original description") // Unchanged
    })

    it("should throw error when updating non-existent listing", async () => {
      await expect(
        ListingService.update("non-existent-id", testUser.id, { title: "Test" })
      ).rejects.toThrow("Listing not found")
    })

    it("should allow update on DRAFT listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "DRAFT" })
      const updated = await ListingService.update(listing.id, testUser.id, { title: "New Title" })
      expect(updated.title).toBe("New Title")
    })

    it("should allow update on PAUSED listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "PAUSED" })
      const updated = await ListingService.update(listing.id, testUser.id, { title: "New Title" })
      expect(updated.title).toBe("New Title")
    })

    it("should throw ValidationError when editing a SOLD listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "SOLD" })

      await expect(
        ListingService.update(listing.id, testUser.id, { title: "New Title" })
      ).rejects.toThrow("Cannot edit a listing with status SOLD")
    })

    it("should throw ValidationError when editing a RESERVED listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "RESERVED" })

      await expect(
        ListingService.update(listing.id, testUser.id, { title: "New Title" })
      ).rejects.toThrow("Cannot edit a listing with status RESERVED")
    })
  })

  describe("delete", () => {
    it("should soft delete listing", async () => {
      const created = await ListingService.create(testUser.id, {
        title: "To Delete",
        description: "Will be deleted",
        category: "FURNITURE" as const,
        condition: "GOOD" as const,
        price: 10000,
        address: "Test Address",
      })

      await ListingService.delete(created.id, testUser.id)

      // Should not be found after deletion
      await expect(
        ListingService.getById(created.id)
      ).rejects.toThrow("Listing not found")
    })

    it("should throw error when deleting non-existent listing", async () => {
      await expect(
        ListingService.delete("non-existent-id", testUser.id)
      ).rejects.toThrow("Listing not found")
    })

    it("should throw ValidationError when deleting a SOLD listing", async () => {
      const listing = await createTestListing(testUser.id, { status: "SOLD" })

      await expect(
        ListingService.delete(listing.id, testUser.id)
      ).rejects.toThrow("Cannot delete a listing with status SOLD")
    })

    it("should throw ValidationError when deleting a REMOVED listing", async () => {
      const listing = await createTestListing(testUser.id, {
        status: "REMOVED",
        deletedAt: new Date(),
      })

      await expect(
        ListingService.delete(listing.id, testUser.id)
      ).rejects.toThrow("Cannot delete a listing with status REMOVED")
    })

    it("should throw ValidationError when listing has active bids", async () => {
      const listing = await createTestListing(testUser.id, { status: "PUBLISHED" })
      const buyer = await createTestUser({ email: "buyer@example.com" })

      // Create an active NegotiationThread
      await testDb.negotiationThread.create({
        data: {
          id: randomUUID(),
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: testUser.id,
          status: "ACTIVE",
          updatedAt: new Date(),
        },
      })

      await expect(
        ListingService.delete(listing.id, testUser.id)
      ).rejects.toThrow("Cannot delete listing with active bids")
    })
  })
})
