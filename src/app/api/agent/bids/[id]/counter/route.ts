import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z } from "zod"

const counterBidSchema = z.object({
  amount: z.number().int().positive().min(100),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().positive().max(7 * 24 * 60 * 60).optional()
})

export const { POST } = createApiHandler({
  POST: async (req, context) => {
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

      const params = await context.params
      const bidId = params.id

      const body = await req.json()
      const validated = counterBidSchema.parse(body)

      const counterBid = await NegotiationService.counterBid(
        bidId,
        auth.userId,
        validated
      )

      return successResponse({
        bidId: counterBid.id,
        amount: counterBid.amount,
        status: counterBid.status,
        expiresAt: counterBid.expiresAt,
        message: "Counter bid placed successfully"
      })
    } catch (error: unknown) {
      console.error("Agent counter bid error:", error)

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Bid not found", 404)
      }

      if (error instanceof Error && error.message.includes("Not authorized")) {
        return errorResponse(error.message, 403)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to counter bid",
        500
      )
    }
  },
})
