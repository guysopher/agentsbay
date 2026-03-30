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

      const params = await context.params
      const listingId = params.id

      const listing = await ListingService.pause(listingId, auth.userId)

      return successResponse({
        id: listing.id,
        title: listing.title,
        status: listing.status,
        updatedAt: listing.updatedAt,
        message: "Listing paused successfully and is no longer visible on the marketplace",
      })
    } catch (error: unknown) {
      console.error("Agent pause listing error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to pause listing",
        500
      )
    }
  },
})
