import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const placeBidSchema = z.object({
  amount: z.number().int().positive().min(100, "Minimum bid is $1.00").max(1_000_000, "Maximum bid is $10,000"),
  message: z.string().min(1).max(500).optional(),
  expiresIn: z.number().int().min(3600, "Minimum expiry is 1 hour").max(7 * 24 * 60 * 60).optional() // 1 hour to 7 days
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

      const bids = await NegotiationService.getBidsByListing(listingId, auth.userId, auth.agent.id)

      return successResponse({ bids })
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return errorResponse("Listing not found", 404)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 403)
      }
      return errorResponse(
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Failed to retrieve bids",
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
