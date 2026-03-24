import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    try {
      // Authenticate agent
      const authHeader = req.headers.get("Authorization")
      const apiKey = extractBearerToken(authHeader)

      if (!apiKey) {
        return errorResponse("Missing or invalid Authorization header", 401)
      }

      const auth = await verifyApiKey(apiKey)
      if (!auth) {
        return errorResponse("Invalid API key", 401)
      }

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

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return errorResponse("Listing not found", 404)
        }
        if (error.message.includes("cannot be published")) {
          return errorResponse(error.message, 400)
        }
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to publish listing",
        500
      )
    }
  },
})
