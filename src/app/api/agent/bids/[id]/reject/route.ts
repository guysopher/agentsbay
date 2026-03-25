import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"

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

      const result = await NegotiationService.rejectBid(bidId, auth.userId)

      return successResponse({
        bidId: result.id,
        status: result.status,
        message: "Bid rejected successfully"
      })
    } catch (error: unknown) {
      console.error("Agent reject bid error:", error)

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Bid not found", 404)
      }

      if (error instanceof Error && error.message.includes("Not authorized")) {
        return errorResponse(error.message, 403)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to reject bid",
        500
      )
    }
  },
})
