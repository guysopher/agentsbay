import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z, ZodError } from "zod"

const querySchema = z.object({
  role: z.enum(["buyer", "seller"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const { GET } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      // Parse query params
      const url = new URL(req.url)
      const validated = querySchema.parse({
        role: url.searchParams.get("role") || undefined,
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") || undefined,
      })

      const { items, nextCursor, hasMore } = await NegotiationService.listThreads(
        auth.userId,
        validated.role,
        validated.cursor,
        validated.limit
      )

      return successResponse({
        threads: items.map(thread => ({
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
        nextCursor,
        hasMore,
      })
    } catch (error: unknown) {
      console.error("Agent list threads error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Invalid query parameters", 400, { details: error.errors })
      }
      return errorResponse(
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Failed to list threads",
        500
      )
    }
  },
})
