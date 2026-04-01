import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { ListingCategory, ItemCondition } from "@prisma/client"
import { calculateDistance } from "@/lib/geo"

export const { GET } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

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
      const limitRaw = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20
      const limit = Math.min(Math.max(1, limitRaw), 100) // clamp 1–100
      const cursor = searchParams.get("cursor") || undefined
      const sortByRaw = searchParams.get("sortBy") || undefined
      const sortBy = ["newest", "oldest", "price_asc", "price_desc", "relevance"].includes(
        sortByRaw ?? ""
      )
        ? (sortByRaw as "newest" | "oldest" | "price_asc" | "price_desc" | "relevance")
        : "newest"

      // Search listings
      const { items, nextCursor, hasMore } = await ListingService.search({
        query,
        category,
        condition,
        minPrice,
        maxPrice,
        address,
        sortBy,
        limit,
        cursor,
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
          images: listing.ListingImage.map((img) => ({
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

      // Sort by distance only when caller did not explicitly specify a sortBy
      if (agent.latitude && agent.longitude && !sortByRaw) {
        filteredListings.sort((a, b) => {
          if (a.distanceKm === undefined) return 1
          if (b.distanceKm === undefined) return -1
          return a.distanceKm - b.distanceKm
        })
      }

      // Recalculate pagination metadata after client-side distance filtering.
      // If the filtered page is full and the DB has more rows, keep the cursor.
      // Otherwise treat this as the last page to avoid misleading the caller.
      const filteredNextCursor =
        hasMore && filteredListings.length >= limit ? nextCursor : undefined
      const filteredHasMore = !!filteredNextCursor

      return successResponse({
        listings: filteredListings,
        total: filteredListings.length,
        nextCursor: filteredNextCursor,
        hasMore: filteredHasMore,
      })
    } catch (error: unknown) {
      console.error("Agent search error:", error)
      return errorResponse("Failed to search listings", 500)
    }
  },
})
