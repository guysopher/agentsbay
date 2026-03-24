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

export class ListingService {
  // Create a new listing
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
            images: true,
            user: {
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

  // Publish a listing
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
            images: true,
            user: {
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

  // Search/filter listings with cursor-based pagination
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
        images: true,
        user: {
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

  // Get listing by ID
  static async getById(id: string) {
    const listing = await db.listing.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        images: true,
        user: {
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

  // Get user's listings
  static async getUserListings(userId: string) {
    const listings = await db.listing.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        images: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return listings.map(withFormattedPrices)
  }

  // Update listing
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
            images: true,
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

  // Delete listing (soft delete)
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
