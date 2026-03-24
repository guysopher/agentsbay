import { ListingService } from "@/domain/listings/service"
import { createListingSchema, searchListingsSchema, validateAddressFormat } from "@/domain/listings/validation"
import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"
import { rateLimiter, RATE_LIMITS } from "@/lib/rate-limit"

export const { GET, POST } = createApiHandler({
  GET: async (request) => {
    const { searchParams } = request.nextUrl

    // Parse and validate search params
    const params = searchListingsSchema.parse({
      query: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      minPrice: searchParams.get("minPrice")
        ? Number(searchParams.get("minPrice"))
        : undefined,
      maxPrice: searchParams.get("maxPrice")
        ? Number(searchParams.get("maxPrice"))
        : undefined,
      condition: searchParams.get("condition") || undefined,
      address: searchParams.get("address") || searchParams.get("location") || undefined, // Support both address and location params
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit")
        ? Number(searchParams.get("limit"))
        : 20,
    })

    const result = await ListingService.search(params)
    return successResponse(result)
  },

  POST: async (request) => {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in to create a listing")
    }

    const userId = session.user.id

    // Rate limiting
    await rateLimiter.check(userId, RATE_LIMITS.LISTING_CREATE)

    // Parse and validate body
    const body = await request.json()
    const validated = createListingSchema.parse(body)

    // Additional address validation for helpful error messages
    const addressValidation = validateAddressFormat(validated.address)
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
    const listing = await ListingService.create(userId, validated)

    return successResponse(listing, 201)
  },
})
