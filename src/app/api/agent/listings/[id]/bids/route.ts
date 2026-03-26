import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z } from "zod"

const placeBidSchema = z.object({
  amount: z.number().int().positive().min(100, "Minimum bid is $1.00"),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().positive().max(7 * 24 * 60 * 60).optional() // Max 7 days
})

export const { POST } = createApiHandler({
  POST: async (req, context) => {
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

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Listing not found", 404)
      }

      if (error instanceof Error && error.message.includes("Cannot bid")) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to place bid",
        500
      )
    }
  },
})
