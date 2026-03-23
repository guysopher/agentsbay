import { ListingService } from "@/domain/listings/service"
import { createListingSchema, searchListingsSchema } from "@/domain/listings/validation"
import { createApiHandler, successResponse } from "@/lib/api-handler"
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
      location: searchParams.get("location") || undefined,
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

    // Create listing
    const listing = await ListingService.create(userId, validated)

    return successResponse(listing, 201)
  },
})
