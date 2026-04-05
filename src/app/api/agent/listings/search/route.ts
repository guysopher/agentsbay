import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { ListingCategory, ItemCondition } from "@prisma/client"
import { calculateDistance } from "@/lib/geo"

/**
 * Compute a lat/lng bounding box from a center point and radius.
 * Used to push geo-filtering into the DB WHERE clause instead of overfetching rows.
 * The bounding box is an approximation; the caller still applies exact Haversine filtering.
 */
function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111.32
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

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
      const minPrice = searchParams.get("priceMin") ?? searchParams.get("minPrice")
        ? parseInt((searchParams.get("priceMin") ?? searchParams.get("minPrice"))!)
        : undefined
      const maxPrice = searchParams.get("priceMax") ?? searchParams.get("maxPrice")
        ? parseInt((searchParams.get("priceMax") ?? searchParams.get("maxPrice"))!)
        : undefined
      const address = searchParams.get("location") || searchParams.get("address") || undefined
      const maxDistanceKm = searchParams.get("maxDistanceKm")
        ? parseFloat(searchParams.get("maxDistanceKm")!)
        : undefined
      // Explicit lat/lng/radius params — these take precedence over agent's stored location
      const latParam = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined
      const lngParam = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined
      const radiusParam = searchParams.get("radius") ? parseFloat(searchParams.get("radius")!) : undefined
      const limitRaw = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20
      const limit = Math.min(Math.max(1, limitRaw), 100) // clamp 1–100
      const cursor = searchParams.get("cursor") || undefined
      const sortByRaw = searchParams.get("sortBy") || undefined
      const sortOrderRaw = searchParams.get("sortOrder") || undefined
      // Normalize sortBy=price + sortOrder=asc/desc into price_asc / price_desc
      const resolvedSortBy =
        sortByRaw === "price"
          ? sortOrderRaw === "desc"
            ? "price_desc"
            : "price_asc"
          : sortByRaw
      const sortBy = ["newest", "oldest", "price_asc", "price_desc", "relevance"].includes(
        resolvedSortBy ?? ""
      )
        ? (resolvedSortBy as "newest" | "oldest" | "price_asc" | "price_desc" | "relevance")
        : "newest"

      const agent = auth.agent

      // Validate explicit lat/lng/radius params
      if ((latParam !== undefined || lngParam !== undefined || radiusParam !== undefined) &&
          (latParam === undefined || lngParam === undefined || radiusParam === undefined)) {
        return errorResponse("lat, lng, and radius must all be provided together", 400)
      }
      if (latParam !== undefined && (isNaN(latParam) || latParam < -90 || latParam > 90)) {
        return errorResponse("lat must be a number between -90 and 90", 400)
      }
      if (lngParam !== undefined && (isNaN(lngParam) || lngParam < -180 || lngParam > 180)) {
        return errorResponse("lng must be a number between -180 and 180", 400)
      }
      if (radiusParam !== undefined && (isNaN(radiusParam) || radiusParam <= 0)) {
        return errorResponse("radius must be a positive number (kilometers)", 400)
      }

      // Reject distance filter when agent has no coordinates rather than silently ignoring it
      if (maxDistanceKm !== undefined && (!agent.latitude || !agent.longitude)) {
        return errorResponse(
          "maxDistanceKm filter requires the agent to have latitude and longitude set",
          400
        )
      }

      // Determine the center + radius for geo-filtering.
      // Explicit lat/lng/radius params take precedence over agent's stored location + maxDistanceKm.
      const geoCenter =
        latParam !== undefined && lngParam !== undefined && radiusParam !== undefined
          ? { lat: latParam, lng: lngParam, radiusKm: radiusParam }
          : maxDistanceKm !== undefined && agent.latitude && agent.longitude
            ? { lat: agent.latitude, lng: agent.longitude, radiusKm: maxDistanceKm }
            : undefined

      // Compute DB-level bounding box when the caller wants a distance filter.
      const bbox = geoCenter ? boundingBox(geoCenter.lat, geoCenter.lng, geoCenter.radiusKm) : undefined

      // Search listings
      const { items, nextCursor, hasMore, total } = await ListingService.search({
        query,
        category,
        condition,
        minPrice,
        maxPrice,
        address,
        sortBy,
        limit,
        cursor,
        ...bbox,
      })

      // Add distance calculation using geoCenter (explicit params or agent's stored location)
      const listingsWithDistance = items.map((listing) => {
        let distanceKm: number | undefined

        if (
          geoCenter &&
          listing.latitude &&
          listing.longitude
        ) {
          distanceKm = calculateDistance(
            geoCenter.lat,
            geoCenter.lng,
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

      // Filter by distance if a geo center is set
      const distanceFilterApplied = geoCenter !== undefined
      let filteredListings = listingsWithDistance
      if (distanceFilterApplied) {
        const beforeCount = listingsWithDistance.length
        filteredListings = listingsWithDistance.filter(
          (listing) =>
            listing.distanceKm !== undefined &&
            listing.distanceKm <= geoCenter!.radiusKm
        )
        if (beforeCount > 0 && filteredListings.length < beforeCount * 0.1) {
          console.warn(
            `[search] Distance filter (radiusKm=${geoCenter!.radiusKm}) reduced results significantly: ${beforeCount} -> ${filteredListings.length}`
          )
        }
      }

      // Sort by distance only when caller did not explicitly specify a sortBy
      if (geoCenter && !sortByRaw) {
        filteredListings.sort((a, b) => {
          if (a.distanceKm === undefined) return 1
          if (b.distanceKm === undefined) return -1
          return a.distanceKm - b.distanceKm
        })
      }

      // Trim to the requested page size
      const pageListings = filteredListings.slice(0, limit)

      // Recalculate pagination metadata after distance filtering.
      // hasMore is true when: the overfetch produced more filtered results than the page
      // limit (meaning we have results left in filteredListings), OR the DB has more rows
      // to fetch. nextCursor is preserved in both cases so callers can keep paginating.
      const filteredHasMore = filteredListings.length > limit || hasMore
      const filteredNextCursor = filteredHasMore ? nextCursor : undefined

      return successResponse({
        listings: pageListings,
        total,
        nextCursor: filteredNextCursor,
        hasMore: filteredHasMore,
        ...(distanceFilterApplied && { distanceFilterApplied: true, resultsFiltered: true }),
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
