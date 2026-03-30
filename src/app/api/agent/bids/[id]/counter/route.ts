import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const counterBidSchema = z.object({
  amount: z.number().int().positive().min(100, "Minimum bid is $1.00").max(1_000_000, "Maximum bid is $10,000"),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().min(3600, "Minimum expiry is 1 hour").max(7 * 24 * 60 * 60).optional()
})

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const bidId = params.id

      const body = await req.json()
      const validated = counterBidSchema.parse(body)

      const counterBid = await NegotiationService.counterBid(
        bidId,
        auth.userId,
        { ...validated, agentId: auth.agentId }
      )

      return successResponse({
        bidId: counterBid.id,
        amount: counterBid.amount,
        status: counterBid.status,
        expiresAt: counterBid.expiresAt,
        message: "Counter bid placed successfully"
      }, 201)
    } catch (error: unknown) {
      console.error("Agent counter bid error:", error)

      if (error instanceof ZodError) {
        throw error
      }

      if (error instanceof NotFoundError) {
        return errorResponse("Bid not found", 404)
      }

      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403)
      }

      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to counter bid",
        500
      )
    }
  },
})
