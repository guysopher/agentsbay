import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { db } from "@/lib/db"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const placeBidSchema = z.object({
  amount: z.number().int().positive().min(100, "Minimum bid is $1.00").max(1_000_000, "Maximum bid is $10,000"),
  message: z.string().min(1).max(500).optional(),
  expiresIn: z.number().int().min(3600, "Minimum expiry is 1 hour").max(7 * 24 * 60 * 60).optional() // 1 hour to 7 days
})

const getBidsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "COUNTERED", "EXPIRED"]).optional(),
})

export const { GET, POST } = createApiHandler({
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      // Verify listing exists and belongs to the authenticated seller
      const listing = await db.listing.findFirst({
        where: { id: listingId, userId: auth.userId, deletedAt: null },
        select: { id: true, title: true, price: true, currency: true, status: true },
      })

      if (!listing) {
        throw new NotFoundError("Listing")
      }

      const url = new URL(req.url)
      const validated = getBidsQuerySchema.parse({
        cursor: url.searchParams.get("cursor") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        status: url.searchParams.get("status") || undefined,
      })

      // Get all bids across all threads for this listing
      const bids = await db.bid.findMany({
        where: {
          NegotiationThread: { listingId },
          ...(validated.status && { status: validated.status }),
        },
        include: {
          NegotiationThread: {
            select: {
              id: true,
              buyerId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: validated.limit + 1,
        ...(validated.cursor && {
          cursor: { id: validated.cursor },
          skip: 1,
        }),
      })

      const hasMore = bids.length > validated.limit
      const items = hasMore ? bids.slice(0, validated.limit) : bids
      const nextCursor = hasMore ? items[items.length - 1].id : null

      return successResponse({
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          currency: listing.currency,
          status: listing.status,
        },
        bids: items.map((bid) => ({
          id: bid.id,
          threadId: bid.threadId,
          buyerId: bid.NegotiationThread.buyerId,
          threadStatus: bid.NegotiationThread.status,
          amount: bid.amount,
          message: bid.message,
          status: bid.status,
          expiresAt: bid.expiresAt,
          createdAt: bid.createdAt,
          updatedAt: bid.updatedAt,
        })),
        count: items.length,
        nextCursor,
        hasMore,
      })
    } catch (error: unknown) {
      console.error("Agent list listing bids error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Invalid query parameters", 400, { details: error.errors })
      }
      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to list bids",
        500
      )
    }
  },

  POST: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      // Get listing ID from params
      const params = await context.params
      const listingId = params.id

      // Parse and validate body
      const body = await req.json()
      const validated = placeBidSchema.parse(body)

      // Place bid
      const result = await NegotiationService.placeBid({
        listingId,
        buyerId: auth.userId,
        buyerAgentId: auth.agent.id,
        amount: validated.amount,
        message: validated.message,
        expiresIn: validated.expiresIn
      })

      return successResponse({
        threadId: result.thread.id,
        bidId: result.bid.id,
        amount: result.bid.amount,
        status: result.bid.status,
        expiresAt: result.bid.expiresAt,
        message: validated.message ? "Bid placed with message" : "Bid placed successfully"
      }, 201)
    } catch (error: unknown) {
      console.error("Agent place bid error:", error)

      if (error instanceof ZodError) {
        throw error
      }

      if (error instanceof NotFoundError) {
        return errorResponse("Listing not found", 404)
      }

      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Failed to place bid",
        500
      )
    }
  },
})
