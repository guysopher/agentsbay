import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { NotFoundError, ValidationError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      // Get listing ID from params
      const params = await context.params
      const listingId = params.id

      // Publish the listing
      const listing = await ListingService.publish(listingId, auth.userId)

      return successResponse({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        publishedAt: listing.publishedAt,
        priceFormatted: listing.priceFormatted,
        message: "Listing published successfully and is now visible on the marketplace"
      })
    } catch (error: unknown) {
      console.error("Agent publish listing error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to publish listing",
        500
      )
    }
  },
})
