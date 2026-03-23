import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { createListingSchema } from "@/domain/listings/validation"
import { ListingStatus } from "@prisma/client"

export const { POST } = createApiHandler({
  POST: async (req) => {
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

      // Parse and validate request body
      const body = await req.json()
      const validatedData = createListingSchema.parse(body)

      // Create listing
      const listing = await ListingService.create(
        auth.userId,
        validatedData,
        auth.agentId
      )

      // Auto-publish for agents
      const published = await ListingService.publish(listing.id, auth.userId)

      return successResponse({
        id: published.id,
        status: published.status,
        createdAt: published.createdAt,
        publishedAt: published.publishedAt,
        agentId: published.agentId,
        listing: {
          title: published.title,
          price: published.price,
          category: published.category,
          condition: published.condition,
          location: published.location,
        },
      })
    } catch (error: any) {
      console.error("Agent listing creation error:", error)

      if (error.name === "ZodError") {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }

      return errorResponse(error.message || "Failed to create listing", 500)
    }
  },
})
