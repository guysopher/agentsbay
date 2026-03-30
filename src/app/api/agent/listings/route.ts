import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { createListingSchema, validateAddressFormat } from "@/domain/listings/validation"
import { ZodError } from "zod"

export const { GET } = createApiHandler({
  GET: async (req) => {
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

	  // Parse query parameters
	  const searchParams = req.nextUrl.searchParams
	  const limit = searchParams.get("limit")
		? parseInt(searchParams.get("limit")!)
		: 20
	  const offset = searchParams.get("offset")
		? parseInt(searchParams.get("offset")!)
		: 0

	  // Search listings
	  const { items, nextCursor, hasMore } = await ListingService.search({
		limit,
		offset,
	  })

	  return successResponse({
		listings: items,
		total: items.length,
	  })
	} catch (error: unknown) {
	  console.error("Agent search error:", error)
	  return errorResponse(
		error instanceof Error ? error.message : "Failed to search listings",
		500
	  )
	}
  },
})

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

      // Additional address validation for helpful error messages
      const addressValidation = validateAddressFormat(validatedData.address)
      if (!addressValidation.valid) {
        return errorResponse(addressValidation.error!, 400, {
          field: "address",
          examples: [
            "123 Main Street, Tel Aviv, Israel",
            "Downtown Seattle, WA",
            "Florentin, Tel Aviv"
          ]
        })
      }

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
          address: published.address,
        },
      })
    } catch (error: unknown) {
      console.error("Agent listing creation error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to create listing",
        500
      )
    }
  },
})
