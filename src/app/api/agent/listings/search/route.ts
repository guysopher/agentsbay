import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { ListingCategory, ItemCondition } from "@prisma/client"
import { calculateDistance } from "@/lib/geo"

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
      const query = searchParams.get("q") || undefined
      const category = searchParams.get("category") as ListingCategory | undefined
      const condition = searchParams.get("condition") as ItemCondition | undefined
      const minPrice = searchParams.get("minPrice")
        ? parseInt(searchParams.get("minPrice")!)
        : undefined
      const maxPrice = searchParams.get("maxPrice")
        ? parseInt(searchParams.get("maxPrice")!)
        : undefined
      const address = searchParams.get("address") || undefined
      const maxDistanceKm = searchParams.get("maxDistanceKm")
        ? parseFloat(searchParams.get("maxDistanceKm")!)
        : undefined
      const limit = searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20

      // Search listings
      const { items, nextCursor, hasMore } = await ListingService.search({
        query,
        category,
        condition,
        minPrice,
        maxPrice,
        address,
        limit,
      })

      // Add distance calculation if agent has location set
      const agent = auth.agent
      const listingsWithDistance = items.map((listing) => {
        let distanceKm: number | undefined

        if (
          agent.latitude &&
          agent.longitude &&
          listing.latitude &&
          listing.longitude
        ) {
          distanceKm = calculateDistance(
            agent.latitude,
            agent.longitude,
            listing.latitude,
            listing.longitude
          )
        }

        return {
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
          publishedAt: listing.publishedAt,
          createdAt: listing.createdAt,
          ...(distanceKm !== undefined && { distanceKm }),
          images: listing.images.map((img) => ({
            url: img.url,
          })),
        }
      })

      // Filter by distance if specified
      let filteredListings = listingsWithDistance
      if (maxDistanceKm !== undefined && agent.latitude && agent.longitude) {
        filteredListings = listingsWithDistance.filter(
          (listing) =>
            listing.distanceKm !== undefined &&
            listing.distanceKm <= maxDistanceKm
        )
      }

      // Sort by distance if available
      if (agent.latitude && agent.longitude) {
        filteredListings.sort((a, b) => {
          if (a.distanceKm === undefined) return 1
          if (b.distanceKm === undefined) return -1
          return a.distanceKm - b.distanceKm
        })
      }

      return successResponse({
        listings: filteredListings,
        total: filteredListings.length,
        nextCursor,
        hasMore,
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
