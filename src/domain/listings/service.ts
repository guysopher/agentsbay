import { db } from "@/lib/db"
import { ListingStatus, Prisma } from "@prisma/client"
import type { CreateListingInput, SearchListingsInput } from "./validation"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import { logError } from "@/lib/errors"
import { geocodeAddress } from "@/lib/geocoding"
import { formatPrice } from "@/lib/formatting"

// Helper to add formatted prices to listing
function withFormattedPrices<T extends { price: number; priceMax?: number | null; currency: string }>(listing: T) {
  return {
    ...listing,
    priceFormatted: formatPrice(listing.price, listing.currency),
    priceMaxFormatted: listing.priceMax ? formatPrice(listing.priceMax, listing.currency) : null,
  }
}

/**
 * Service for managing marketplace listings
 * Handles creation, publication, search, and lifecycle management of listings
 */
export class ListingService {
  /**
   * Create a new listing in DRAFT status
   * @param userId - ID of the user creating the listing
   * @param data - Listing data (title, description, price, address, etc.)
   * @param agentId - Optional ID of the agent creating the listing
   * @returns Created listing with formatted prices
   * @throws {ValidationError} If required fields are missing or invalid
   * @emits listing.created
   * @example
   * ```ts
   * const listing = await ListingService.create(userId, {
   *   title: "Vintage Camera",
   *   description: "Excellent condition",
   *   price: 15000, // in cents
   *   category: "ELECTRONICS",
   *   condition: "GOOD",
   *   address: "123 Main St, Tel Aviv"
   * })
   * ```
   */
  static async create(userId: string, data: CreateListingInput, agentId?: string) {
    try {
      // Geocode address if coordinates not provided
      let latitude = data.latitude
      let longitude = data.longitude

      if (!latitude || !longitude) {
        const geocoded = await geocodeAddress(data.address)
        if (geocoded) {
          latitude = geocoded.latitude
          longitude = geocoded.longitude
        }
      }

      const listing = await db.$transaction(async (tx) => {
        // Create listing
        const listing = await tx.listing.create({
          data: {
            userId,
            agentId,
            title: data.title,
            description: data.description,
            labels: data.labels ?? [],
            category: data.category,
            condition: data.condition,
            price: data.price,
            priceMax: data.priceMax,
            currency: data.currency ?? "USD",
            address: data.address,
            latitude,
            longitude,
            contactWhatsApp: data.contactWhatsApp,
            contactTelegram: data.contactTelegram,
            contactDiscord: data.contactDiscord,
            pickupAvailable: data.pickupAvailable ?? true,
            deliveryAvailable: data.deliveryAvailable ?? false,
            status: ListingStatus.DRAFT,
          },
          include: {
            ListingImage: true,
            User: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        // Audit log (in same transaction)
        await tx.auditLog.create({
          data: {
            userId,
            agentId,
            action: "listing.created",
            entityType: "listing",
            entityId: listing.id,
            metadata: { title: data.title },
          },
        })

        return listing
      })

      // Emit event after transaction succeeds
      await eventBus.emit("listing.created", {
        listingId: listing.id,
        userId,
        title: data.title,
      })

      return withFormattedPrices(listing)
    } catch (error) {
      logError(error, { userId, data })
      throw error
    }
  }

  /**
   * Publish a listing (move from DRAFT to PUBLISHED status)
   * @param listingId - ID of the listing to publish
   * @param userId - ID of the user (must be listing owner)
   * @returns Published listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist or doesn't belong to user
   * @throws {ValidationError} If listing status doesn't allow publication
   * @emits listing.published
   * @example
   * ```ts
   * await ListingService.publish(listingId, userId)
   * ```
   */
  static async publish(listingId: string, userId: string) {
    try {
      // Check listing exists and belongs to user
      const listing = await db.listing.findFirst({
        where: {
          id: listingId,
          userId,
        },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      if (listing.status !== ListingStatus.DRAFT && listing.status !== ListingStatus.PENDING_REVIEW) {
        throw new ValidationError("Listing cannot be published from current status")
      }

      const updated = await db.$transaction(async (tx) => {
        const updated = await tx.listing.update({
          where: { id: listingId },
          data: {
            status: ListingStatus.PUBLISHED,
            publishedAt: new Date(),
          },
          include: {
            ListingImage: true,
            User: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        await tx.auditLog.create({
          data: {
            userId,
            action: "listing.published",
            entityType: "listing",
            entityId: listingId,
          },
        })

        return updated
      })

      // Emit event
      await eventBus.emit("listing.published", {
        listingId,
        userId,
      })

      return withFormattedPrices(updated)
    } catch (error) {
      logError(error, { listingId, userId })
      throw error
    }
  }

  /**
   * Search published listings with filtering and cursor-based pagination
   * @param params - Search parameters (query, category, price range, address, pagination)
   * @returns Paginated results with items, nextCursor, and hasMore flag
   * @example
   * ```ts
   * const results = await ListingService.search({
   *   query: "laptop",
   *   category: "ELECTRONICS",
   *   minPrice: 50000, // $500 in cents
   *   maxPrice: 100000, // $1000 in cents
   *   limit: 20
   * })
   * // results = { items: [...], nextCursor: "abc123", hasMore: true }
   * ```
   */
  static async search(params: SearchListingsInput) {
    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.PUBLISHED,
      deletedAt: null, // Exclude soft-deleted listings
    }

    if (params.query) {
      where.OR = [
        { title: { contains: params.query, mode: "insensitive" } },
        { description: { contains: params.query, mode: "insensitive" } },
      ]
    }

    if (params.category) {
      where.category = params.category
    }

    if (params.condition) {
      where.condition = params.condition
    }

    if (params.minPrice || params.maxPrice) {
      where.price = {}
      if (params.minPrice) where.price.gte = params.minPrice
      if (params.maxPrice) where.price.lte = params.maxPrice
    }

    if (params.address) {
      where.address = { contains: params.address, mode: "insensitive" }
    }

    const limit = params.limit || 20

    const listings = await db.listing.findMany({
      where,
      include: {
        ListingImage: true,
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit + 1, // Fetch one extra to check if there's more
      ...(params.cursor && {
        cursor: {
          id: params.cursor,
        },
        skip: 1, // Skip the cursor itself
      }),
    })

    // Check if there are more results
    const hasMore = listings.length > limit
    const results = hasMore ? listings.slice(0, limit) : listings
    const nextCursor = hasMore ? results[results.length - 1].id : null

    return {
      items: results.map(withFormattedPrices),
      nextCursor,
      hasMore,
    }
  }

  /**
   * Get a single listing by ID
   * @param id - Listing ID
   * @returns Listing with images, user info, and agent details
   * @throws {NotFoundError} If listing doesn't exist or was deleted
   * @example
   * ```ts
   * const listing = await ListingService.getById("listing123")
   * ```
   */
  static async getById(id: string) {
    const listing = await db.listing.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        ListingImage: true,
        User: {
          select: {
            id: true,
            name: true,
          },
        },
        agent: true,
      },
    })

    if (!listing) {
      throw new NotFoundError("Listing")
    }

    return withFormattedPrices(listing)
  }

  /**
   * Get all listings created by a specific user (excludes soft-deleted)
   * @param userId - ID of the user
   * @returns Array of user's listings with formatted prices
   * @example
   * ```ts
   * const myListings = await ListingService.getUserListings(userId)
   * ```
   */
  static async getUserListings(userId: string) {
    const listings = await db.listing.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        ListingImage: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return listings.map(withFormattedPrices)
  }

  /**
   * Update an existing listing (partial update supported)
   * @param listingId - ID of the listing to update
   * @param userId - ID of the user (must be listing owner)
   * @param data - Partial listing data to update
   * @returns Updated listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist or doesn't belong to user
   * @example
   * ```ts
   * await ListingService.update(listingId, userId, {
   *   title: "Updated Title",
   *   price: 20000 // $200 in cents
   * })
   * ```
   */
  static async update(listingId: string, userId: string, data: Partial<CreateListingInput>) {
    try {
      const listing = await db.listing.findFirst({
        where: {
          id: listingId,
          userId,
        },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      const updated = await db.$transaction(async (tx) => {
        const updated = await tx.listing.update({
          where: { id: listingId },
          data,
          include: {
            ListingImage: true,
          },
        })

        await tx.auditLog.create({
          data: {
            userId,
            action: "listing.updated",
            entityType: "listing",
            entityId: listingId,
            metadata: { updates: Object.keys(data) },
          },
        })

        return updated
      })

      await eventBus.emit("listing.updated", { listingId, userId })

      return withFormattedPrices(updated)
    } catch (error) {
      logError(error, { listingId, userId, data })
      throw error
    }
  }

  /**
   * Delete a listing (soft delete - marks as REMOVED and sets deletedAt timestamp)
   * @param listingId - ID of the listing to delete
   * @param userId - ID of the user (must be listing owner)
   * @returns Deleted listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist, doesn't belong to user, or already deleted
   * @emits listing.deleted
   * @example
   * ```ts
   * await ListingService.delete(listingId, userId)
   * ```
   */
  static async delete(listingId: string, userId: string) {
    try {
      const listing = await db.listing.findFirst({
        where: {
          id: listingId,
          userId,
          deletedAt: null,
        },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      const deleted = await db.$transaction(async (tx) => {
        const deleted = await tx.listing.update({
          where: { id: listingId },
          data: {
            status: ListingStatus.REMOVED,
            deletedAt: new Date(),
          },
        })

        await tx.auditLog.create({
          data: {
            userId,
            action: "listing.deleted",
            entityType: "listing",
            entityId: listingId,
          },
        })

        return deleted
      })

      await eventBus.emit("listing.deleted", { listingId, userId })

      return deleted
    } catch (error) {
      logError(error, { listingId, userId })
      throw error
    }
  }
}
