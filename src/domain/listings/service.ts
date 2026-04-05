import { db } from "@/lib/db"
import { ListingStatus, ThreadStatus, Prisma } from "@prisma/client"
import type { CreateListingInput, SearchListingsInput } from "./validation"
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import { logError } from "@/lib/errors"
import { geocodeAddress } from "@/lib/geocoding"
import { formatPrice } from "@/lib/formatting"
import { randomUUID } from "crypto"
import { ModerationService } from "@/domain/trust/moderation"

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const DUPLICATE_SIMILARITY_THRESHOLD = 0.8

/** Normalize a listing title for duplicate comparison */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim()
}

/** Jaccard similarity on word-token sets (0..1) */
function titleSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeTitle(a).split(" ").filter(Boolean))
  const setB = new Set(normalizeTitle(b).split(" ").filter(Boolean))
  if (setA.size === 0 && setB.size === 0) return 1
  if (setA.size === 0 || setB.size === 0) return 0
  const intersection = new Set([...setA].filter((w) => setB.has(w)))
  const union = new Set([...setA, ...setB])
  return intersection.size / union.size
}

// Helper to add formatted prices to listing
function withFormattedPrices<T extends { price: number; priceMax?: number | null; currency: string }>(listing: T) {
  return {
    ...listing,
    priceFormatted: formatPrice(listing.price, listing.currency),
    priceMaxFormatted: listing.priceMax ? formatPrice(listing.priceMax, listing.currency) : null,
  }
}

/**
 * Compute a match quality score (0–1) for a listing against a search query.
 * Higher = stronger match. Used to drive relevance sort and UI indicators.
 *
 * Scoring tiers:
 *  1.00 – exact title match
 *  0.95 – title starts with query
 *  0.90 – title contains full query phrase
 *  0.80 – all query words present in title
 *  0.60–0.74 – some query words in title (proportional)
 *  0.50 – description contains full query phrase
 *  0.30–0.44 – some query words in description (proportional)
 *  0.25 – match via labels only
 */
function computeMatchScore(query: string, title: string, description: string, labels: string[]): number {
  const q = query.toLowerCase().trim()
  if (!q) return 1

  const t = title.toLowerCase()
  const d = description.toLowerCase()
  const words = q.split(/\s+/).filter(Boolean)

  if (t === q) return 1.0
  if (t.startsWith(q)) return 0.95
  if (t.includes(q)) return 0.90

  const titleMatches = words.filter((w) => t.includes(w)).length
  if (titleMatches === words.length) return 0.80
  if (titleMatches > 0) return 0.60 + (titleMatches / words.length) * 0.14

  if (d.includes(q)) return 0.50
  const descMatches = words.filter((w) => d.includes(w)).length
  if (descMatches > 0) return 0.30 + (descMatches / words.length) * 0.14

  if (labels.some((l) => l.toLowerCase().includes(q))) return 0.25

  return 0.10
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
      // Check for duplicate listings by same seller within the last 24 hours
      const since = new Date(Date.now() - DUPLICATE_WINDOW_MS)
      const recentListings = await db.listing.findMany({
        where: {
          userId,
          createdAt: { gte: since },
          status: { notIn: [ListingStatus.REMOVED] },
          deletedAt: null,
        },
        select: { id: true, title: true },
      })
      for (const existing of recentListings) {
        const similarity = titleSimilarity(data.title, existing.title)
        if (similarity > DUPLICATE_SIMILARITY_THRESHOLD) {
          throw new ConflictError(
            `Duplicate listing detected: a similar listing was posted within the last 24 hours (existing id: ${existing.id})`
          )
        }
      }

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
        const now = new Date()
        // Create listing
        const listing = await tx.listing.create({
          data: {
            id: randomUUID(),
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
            confidence: data.confidenceScore,
            status: ListingStatus.DRAFT,
            updatedAt: now,
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
            id: randomUUID(),
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

      // Reject listings with condition=NEW — this is a second-hand marketplace;
      // valid conditions are GOOD, LIKE_NEW, FAIR, and POOR.
      if (listing.condition === "NEW") {
        throw new ValidationError("Listings with condition 'NEW' cannot be published. Valid conditions are: LIKE_NEW, GOOD, FAIR, POOR.")
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
            id: randomUUID(),
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

      // Auto-flag suspicious pricing (fire-and-forget, never blocks publication)
      void ModerationService.checkAutoFlag(listingId)

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
      deletedAt: null,
    }

    if (params.query) {
      // Split into words and require ALL words to match somewhere in title or description.
      // This gives significantly better multi-word results than a single whole-phrase ILIKE.
      const words = params.query
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean)

      if (words.length === 1) {
        where.OR = [
          { title: { contains: words[0], mode: "insensitive" } },
          { description: { contains: words[0], mode: "insensitive" } },
          { labels: { has: words[0].toLowerCase() } },
        ]
      } else {
        // AND across words — each word must appear in title OR description
        where.AND = words.map((word) => ({
          OR: [
            { title: { contains: word, mode: "insensitive" } },
            { description: { contains: word, mode: "insensitive" } },
          ],
        }))
      }
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

    if (params.agentId) {
      where.agentId = params.agentId
    }

    // DB-level bounding box: only fetch rows within the lat/lng range before
    // applying the exact Haversine filter in the caller. This replaces the 10x
    // overfetch hack and ensures limit=20 fetches at most ~20 rows from the DB.
    if (params.minLat !== undefined || params.maxLat !== undefined) {
      where.latitude = {
        ...(params.minLat !== undefined && { gte: params.minLat }),
        ...(params.maxLat !== undefined && { lte: params.maxLat }),
      }
    }
    if (params.minLng !== undefined || params.maxLng !== undefined) {
      where.longitude = {
        ...(params.minLng !== undefined && { gte: params.minLng }),
        ...(params.maxLng !== undefined && { lte: params.maxLng }),
      }
    }

    const limit = params.limit || 20
    const sortBy = params.sortBy ?? "newest"

    let orderBy: Prisma.ListingOrderByWithRelationInput
    switch (sortBy) {
      case "oldest":
        orderBy = { createdAt: "asc" }
        break
      case "price_asc":
        orderBy = { price: "asc" }
        break
      case "price_desc":
        orderBy = { price: "desc" }
        break
      case "relevance":
        // Title matches rank higher — achieved by fetching then re-sorting in app code below
        orderBy = { createdAt: "desc" }
        break
      case "newest":
      default:
        orderBy = { createdAt: "desc" }
    }

    const [listings, total] = await Promise.all([
      db.listing.findMany({
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
        orderBy,
        take: limit + 1,
        ...(params.cursor && {
          cursor: { id: params.cursor },
          skip: 1,
        }),
      }),
      db.listing.count({ where }),
    ])

    const hasMore = listings.length > limit
    const results = hasMore ? listings.slice(0, limit) : listings

    // Compute match score for every result (1 when no query active)
    const scored = results.map((listing) => ({
      ...withFormattedPrices(listing),
      matchScore: params.query
        ? computeMatchScore(params.query, listing.title, listing.description, listing.labels)
        : 1,
    }))

    // For relevance sort: rank by match score descending
    if (sortBy === "relevance" && params.query) {
      scored.sort((a, b) => b.matchScore - a.matchScore)
    }

    const nextCursor = hasMore ? scored[scored.length - 1].id : null

    return {
      items: scored,
      nextCursor,
      hasMore,
      total,
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
        Agent: true,
      },
    })

    if (!listing) {
      throw new NotFoundError("Listing")
    }

    return withFormattedPrices(listing)
  }

  /**
   * Get listings created by a specific user with optional status filter and cursor pagination.
   * @param userId - ID of the user
   * @param opts - Optional status filter, cursor, and limit
   * @returns Paginated result with items, nextCursor, and hasMore
   */
  static async getUserListings(userId: string, opts?: {
    status?: ListingStatus
    cursor?: string
    limit?: number
  }) {
    const limit = opts?.limit ?? 20
    const where: Prisma.ListingWhereInput = {
      userId,
      deletedAt: null,
      ...(opts?.status && { status: opts.status }),
    }

    const listings = await db.listing.findMany({
      where,
      include: {
        ListingImage: { take: 1 },
        NegotiationThread: {
          where: { status: ThreadStatus.ACTIVE },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(opts?.cursor && {
        cursor: { id: opts.cursor },
        skip: 1,
      }),
    })

    const hasMore = listings.length > limit
    const items = listings.slice(0, limit).map(withFormattedPrices)

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    }
  }

  /**
   * Pause a published listing (move from PUBLISHED to PAUSED status)
   * @param listingId - ID of the listing to pause
   * @param userId - ID of the user (must be listing owner)
   * @returns Paused listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist or doesn't belong to user
   * @throws {ValidationError} If listing is not in PUBLISHED status
   * @emits listing.paused
   */
  static async pause(listingId: string, userId: string) {
    try {
      // Read + validate + write inside transaction to prevent TOCTOU race conditions
      const updated = await db.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: { id: listingId, userId },
          include: {
            NegotiationThread: {
              where: { status: ThreadStatus.ACTIVE },
              select: { id: true },
            },
          },
        })

        if (!listing) {
          throw new NotFoundError("Listing")
        }

        if (listing.status !== ListingStatus.PUBLISHED) {
          throw new ValidationError(`Cannot pause a listing with status ${listing.status}`)
        }

        if (listing.NegotiationThread.length > 0) {
          throw new ValidationError("Cannot pause listing with active negotiations")
        }

        const updated = await tx.listing.update({
          where: { id: listingId },
          data: { status: ListingStatus.PAUSED },
          include: {
            ListingImage: true,
            User: { select: { id: true, name: true } },
          },
        })

        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            userId,
            action: "listing.paused",
            entityType: "listing",
            entityId: listingId,
          },
        })

        return updated
      })

      await eventBus.emit("listing.paused", { listingId, userId })

      return withFormattedPrices(updated)
    } catch (error) {
      logError(error, { listingId, userId })
      throw error
    }
  }

  /**
   * Relist a paused listing (move from PAUSED back to PUBLISHED status)
   * @param listingId - ID of the listing to relist
   * @param userId - ID of the user (must be listing owner)
   * @returns Relisted listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist or doesn't belong to user
   * @throws {ValidationError} If listing is not in PAUSED status
   * @emits listing.relisted
   */
  static async relist(listingId: string, userId: string) {
    try {
      // Read + validate + write inside transaction to prevent TOCTOU race conditions
      const updated = await db.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: { id: listingId, userId },
        })

        if (!listing) {
          throw new NotFoundError("Listing")
        }

        if (listing.status !== ListingStatus.PAUSED) {
          throw new ValidationError(`Cannot relist a listing with status ${listing.status}`)
        }

        const updated = await tx.listing.update({
          where: { id: listingId },
          data: { status: ListingStatus.PUBLISHED, publishedAt: new Date() },
          include: {
            ListingImage: true,
            User: { select: { id: true, name: true } },
          },
        })

        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            userId,
            action: "listing.relisted",
            entityType: "listing",
            entityId: listingId,
          },
        })

        return updated
      })

      await eventBus.emit("listing.relisted", { listingId, userId })

      return withFormattedPrices(updated)
    } catch (error) {
      logError(error, { listingId, userId })
      throw error
    }
  }

  /**
   * Update an existing listing (partial update supported)
   * @param listingId - ID of the listing to update
   * @param userId - ID of the user (must be listing owner)
   * @param data - Partial listing data to update
   * @returns Updated listing with formatted prices
   * @throws {NotFoundError} If listing doesn't exist or doesn't belong to user
   * @throws {ValidationError} If listing status does not allow edits
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
      // Read + validate + write inside transaction to prevent TOCTOU race conditions
      const updated = await db.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: {
            id: listingId,
            userId,
            deletedAt: null,
          },
        })

        if (!listing) {
          throw new NotFoundError("Listing")
        }

        const editableStatuses: ListingStatus[] = [ListingStatus.DRAFT, ListingStatus.PUBLISHED, ListingStatus.PAUSED]
        if (!editableStatuses.includes(listing.status)) {
          throw new ValidationError(`Cannot edit a listing with status ${listing.status}`)
        }

        const updated = await tx.listing.update({
          where: { id: listingId },
          data,
          include: {
            ListingImage: true,
          },
        })

        await tx.auditLog.create({
          data: {
            id: randomUUID(),
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
      // Read + validate + write inside transaction to prevent TOCTOU race conditions
      // (including the active-bid check, which must be atomic with the delete)
      const deleted = await db.$transaction(async (tx) => {
        const listing = await tx.listing.findFirst({
          where: { id: listingId, userId },
          include: {
            NegotiationThread: {
              where: { status: ThreadStatus.ACTIVE },
              select: { id: true },
            },
          },
        })

        if (!listing) {
          throw new NotFoundError("Listing")
        }

        if (
          listing.status === ListingStatus.SOLD ||
          listing.status === ListingStatus.REMOVED ||
          listing.status === ListingStatus.RESERVED
        ) {
          throw new ValidationError(`Cannot delete a listing with status ${listing.status}`)
        }

        if (listing.NegotiationThread.length > 0) {
          throw new ValidationError("Cannot delete listing with active bids")
        }

        const deleted = await tx.listing.update({
          where: { id: listingId },
          data: {
            status: ListingStatus.REMOVED,
            deletedAt: new Date(),
          },
        })

        await tx.auditLog.create({
          data: {
            id: randomUUID(),
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
