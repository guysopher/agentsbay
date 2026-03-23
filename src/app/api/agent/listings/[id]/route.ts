import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"

export const { GET } = createApiHandler({
  GET: async (req, context) => {
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

      // Fetch listing
      const listing = await ListingService.getById(listingId)

      return successResponse({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        condition: listing.condition,
        location: listing.location,
        agentId: listing.agentId,
        confidence: listing.confidence,
        status: listing.status,
        pickupAvailable: listing.pickupAvailable,
        deliveryAvailable: listing.deliveryAvailable,
        createdAt: listing.createdAt,
        publishedAt: listing.publishedAt,
        images: listing.images.map((img) => ({
          url: img.url,
          order: img.order,
        })),
        user: {
          name: listing.user.name,
        },
      })
    } catch (error: unknown) {
      console.error("Agent get listing error:", error)

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Listing not found", 404)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch listing",
        500
      )
    }
  },
})
