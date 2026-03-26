import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z } from "zod"

const querySchema = z.object({
  role: z.enum(["buyer", "seller"]).optional()
})

export const { GET } = createApiHandler({
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

      // Parse query params
      const url = new URL(req.url)
      const role = url.searchParams.get("role")

      const validated = querySchema.parse({
        role: role || undefined
      })

      const threads = await NegotiationService.listThreads(
        auth.userId,
        validated.role
      )

      return successResponse({
        threads: threads.map(thread => ({
          id: thread.id,
          listingId: thread.listingId,
          listing: {
            id: thread.Listing.id,
            title: thread.Listing.title,
            price: thread.Listing.price,
            currency: thread.Listing.currency,
            status: thread.Listing.status
          },
          buyerId: thread.buyerId,
          sellerId: thread.sellerId,
          status: thread.status,
          latestBid: thread.Bid[0] ? {
            id: thread.Bid[0].id,
            amount: thread.Bid[0].amount,
            status: thread.Bid[0].status,
            expiresAt: thread.Bid[0].expiresAt,
            createdAt: thread.Bid[0].createdAt
          } : null,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          closedAt: thread.closedAt
        })),
        count: threads.length
      })
    } catch (error: unknown) {
      console.error("Agent list threads error:", error)

      return errorResponse(
        error instanceof Error ? error.message : "Failed to list threads",
        500
      )
    }
  },
})
