import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { extractBearerToken, verifyApiKey } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"

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
      const order = await OrderService.closeout(params.id, auth.userId)

      return successResponse({
        id: order.id,
        status: order.status,
        completedAt: order.completedAt,
        updatedAt: order.updatedAt,
        message: "Order closeout completed successfully",
      })
    } catch (error: unknown) {
      console.error("Agent closeout order error:", error)

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return errorResponse("Order not found", 404)
        }
        if (
          error.message.includes("current status") ||
          error.message.includes("delivered") ||
          error.message.includes("Validation")
        ) {
          return errorResponse(error.message, 400)
        }
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to close out order",
        500
      )
    }
  },
})
