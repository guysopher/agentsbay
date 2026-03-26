import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { extractBearerToken, verifyApiKey } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"
import { z } from "zod"

const pickupSchema = z.object({
  pickupLocation: z.string().min(3, "pickupLocation must be at least 3 characters"),
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
      const body = await req.json()
      const input = pickupSchema.parse(body)

      const order = await OrderService.schedulePickup(params.id, auth.userId, input)

      return successResponse({
        id: order.id,
        status: order.status,
        pickupLocation: order.pickupLocation,
        updatedAt: order.updatedAt,
        message: "Pickup scheduled successfully",
      })
    } catch (error: unknown) {
      console.error("Agent schedule pickup error:", error)

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return errorResponse("Order not found", 404)
        }
        if (
          error.message.includes("pickup") ||
          error.message.includes("current status") ||
          error.message.includes("Validation")
        ) {
          return errorResponse(error.message, 400)
        }
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to schedule pickup",
        500
      )
    }
  },
})
