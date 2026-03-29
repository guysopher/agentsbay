import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const pickupSchema = z.object({
  pickupLocation: z.string().min(3, "pickupLocation must be at least 3 characters").max(500, "Pickup location too long"),
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

      if (error instanceof ZodError) {
        throw error
      }

      if (error instanceof NotFoundError) {
        return errorResponse("Order not found", 404)
      }

      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to schedule pickup",
        500
      )
    }
  },
})
