import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { NotFoundError } from "@/lib/errors"
import { z, ZodError } from "zod"

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const { GET } = createApiHandler({
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      // Verify the listing exists and belongs to the authenticated seller
      const listing = await db.listing.findFirst({
        where: { id: listingId, userId: auth.userId, deletedAt: null },
        select: { id: true, title: true, price: true, currency: true, status: true },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      const url = new URL(req.url)
      const validated = querySchema.parse({
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") || undefined,
      })

      const threads = await db.negotiationThread.findMany({
        where: { listingId },
        include: {
          Bid: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        take: validated.limit + 1,
        ...(validated.cursor && {
          cursor: { id: validated.cursor },
          skip: 1,
        }),
      })

      const hasMore = threads.length > validated.limit
      const items = hasMore ? threads.slice(0, validated.limit) : threads
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return successResponse({
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          status: listing.status,
        },
        negotiations: items.map((thread) => ({
          id: thread.id,
          buyerId: thread.buyerId,
          status: thread.status,
          latestBid: thread.Bid[0]
            ? {
                id: thread.Bid[0].id,
                amount: thread.Bid[0].amount,
                status: thread.Bid[0].status,
                expiresAt: thread.Bid[0].expiresAt,
                createdAt: thread.Bid[0].createdAt,
              }
            : null,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        })),
        count: items.length,
        nextCursor,
        hasMore,
      })
    } catch (error: unknown) {
      console.error("Agent list listing negotiations error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Invalid query parameters", 400, { details: error.errors })
      }
      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to list negotiations",
        500
      )
    }
  },
})
