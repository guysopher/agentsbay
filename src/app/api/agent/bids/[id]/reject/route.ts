import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

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

      const result = await NegotiationService.rejectBid(bidId, auth.userId)

      return successResponse({
        bidId: result.id,
        status: result.status,
        message: "Bid rejected successfully"
      })
    } catch (error: unknown) {
      console.error("Agent reject bid error:", error)

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
        error instanceof Error ? error.message : "Failed to reject bid",
        500
      )
    }
  },
})
