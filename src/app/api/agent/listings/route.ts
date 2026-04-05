import { NextResponse } from "next/server"
import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { ListingService } from "@/domain/listings/service"
import { createListingSchema, validateAddressFormat } from "@/domain/listings/validation"
import { ConflictError } from "@/lib/errors"
import { ListingCategory, ItemCondition } from "@prisma/client"
import { ZodError } from "zod"

export const { GET, POST } = createApiHandler({
  GET: async (req) => {
    try {
      const authHeader = req.headers.get("Authorization")
      const apiKey = extractBearerToken(authHeader)

      if (!apiKey) {
        return errorResponse("Missing or invalid Authorization header", 401)
      }

      const auth = await verifyApiKey(apiKey)
      if (!auth) {
        return errorResponse("Invalid API key", 401)
      }

      const { searchParams } = req.nextUrl
      const cursor = searchParams.get("cursor") ?? undefined
      const limitParam = searchParams.get("limit")
      const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 20, 100) : 20

      const category = searchParams.get("category") as ListingCategory | undefined ?? undefined
      const condition = searchParams.get("condition") as ItemCondition | undefined ?? undefined
      const query = searchParams.get("q") || undefined
      const address = searchParams.get("address") || undefined
      const sortByRaw = searchParams.get("sortBy") || undefined
      const sortBy = (["newest", "oldest", "price_asc", "price_desc", "relevance"].includes(sortByRaw ?? "")
        ? sortByRaw
        : "newest") as "newest" | "oldest" | "price_asc" | "price_desc" | "relevance"
      const minPriceRaw = searchParams.get("minPrice") ?? searchParams.get("priceMin")
      const maxPriceRaw = searchParams.get("maxPrice") ?? searchParams.get("priceMax")
      const minPrice = minPriceRaw ? parseInt(minPriceRaw, 10) : undefined
      const maxPrice = maxPriceRaw ? parseInt(maxPriceRaw, 10) : undefined

      // Browse all PUBLISHED listings from all sellers (not filtered by caller's agentId)
      const result = await ListingService.search({
        cursor,
        limit,
        sortBy,
        category,
        condition,
        query,
        address,
        minPrice,
        maxPrice,
      })

      return successResponse({
        items: result.items.map((listing) => ({
          id: listing.id,
          title: listing.title,
          price: listing.price,
          priceMax: listing.priceMax,
          priceFormatted: listing.priceFormatted,
          currency: listing.currency,
          category: listing.category,
          condition: listing.condition,
          status: listing.status,
          address: listing.address,
          agentId: listing.agentId,
          createdAt: listing.createdAt,
          publishedAt: listing.publishedAt,
          images: listing.ListingImage.map((img) => ({ url: img.url, order: img.order })),
        })),
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      })
    } catch (error: unknown) {
      console.error("Agent list listings error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to list listings",
        500
      )
    }
  },

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

      if (error instanceof ConflictError) {
        return NextResponse.json(
          { error: { code: "DUPLICATE_LISTING", message: error.message } },
          { status: 409 }
        )
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to create listing",
        500
      )
    }
  },
})
