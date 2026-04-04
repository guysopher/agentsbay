import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { calculateDistance } from "@/lib/geo"
import { updateListingSchema } from "@/domain/listings/validation"
import { ValidationError, NotFoundError } from "@/lib/errors"

export const { GET, PATCH, DELETE } = createApiHandler({
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      // Get listing ID from params
      const params = await context.params
      const listingId = params.id

      // Fetch listing
      const listing = await ListingService.getById(listingId)

      // Calculate distance if both agent and listing have coordinates
      let distanceKm: number | undefined
      if (
        auth.agent.latitude &&
        auth.agent.longitude &&
        listing.latitude &&
        listing.longitude
      ) {
        distanceKm = calculateDistance(
          auth.agent.latitude,
          auth.agent.longitude,
          listing.latitude,
          listing.longitude
        )
      }

      return successResponse({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        labels: listing.labels,
        price: listing.price,
        priceMax: listing.priceMax,
        currency: listing.currency,
        category: listing.category,
        condition: listing.condition,
        address: listing.address,
        latitude: listing.latitude,
        longitude: listing.longitude,
        contactWhatsApp: listing.contactWhatsApp,
        contactTelegram: listing.contactTelegram,
        contactDiscord: listing.contactDiscord,
        agentId: listing.agentId,
        confidence: listing.confidence,
        status: listing.status,
        pickupAvailable: listing.pickupAvailable,
        deliveryAvailable: listing.deliveryAvailable,
        createdAt: listing.createdAt,
        publishedAt: listing.publishedAt,
        soldAt: listing.soldAt,
        ...(distanceKm !== undefined && { distanceKm }),
        images: listing.ListingImage.map((img) => ({
          url: img.url,
          order: img.order,
        })),
        user: {
          name: listing.User.name,
        },
      })
    } catch (error: unknown) {
      console.error("Agent get listing error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch listing",
        500
      )
    }
  },

  PATCH: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      const body = await req.json()
      const parsed = updateListingSchema.safeParse(body)
      if (!parsed.success) {
        return errorResponse(parsed.error.errors[0]?.message ?? "Invalid request body", 400)
      }

      const { status: requestedStatus, ...fieldUpdates } = parsed.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let listing: any = null

      // Route status transitions to dedicated service methods that enforce
      // business rules (e.g. no active negotiations, correct current status).
      if (requestedStatus === "PAUSED") {
        listing = await ListingService.pause(listingId, auth.userId)
      } else if (requestedStatus === "PUBLISHED") {
        listing = await ListingService.relist(listingId, auth.userId)
      }

      // Apply any other field updates independently
      if (Object.keys(fieldUpdates).length > 0) {
        listing = await ListingService.update(listingId, auth.userId, fieldUpdates)
      }

      if (!listing) {
        return errorResponse("No fields to update", 400)
      }

      return successResponse({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        priceMax: listing.priceMax,
        priceFormatted: listing.priceFormatted,
        currency: listing.currency,
        category: listing.category,
        condition: listing.condition,
        status: listing.status,
        updatedAt: listing.updatedAt,
      })
    } catch (error: unknown) {
      console.error("Agent patch listing error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to update listing",
        500
      )
    }
  },

  DELETE: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      const listing = await ListingService.delete(listingId, auth.userId)

      return successResponse({
        id: listing.id,
        status: listing.status,
        deletedAt: listing.deletedAt,
      })
    } catch (error: unknown) {
      console.error("Agent delete listing error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to delete listing",
        500
      )
    }
  },
})
