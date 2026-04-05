import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"
import { NotFoundError, ValidationError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }
    const { auth } = authResult

    const params = await context.params

    try {
      const order = await OrderService.completeOrder(params.id, auth.userId)
      return successResponse({ id: order.id, status: order.status, completedAt: order.completedAt, updatedAt: order.updatedAt })
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Order not found", 404)
      if (err instanceof ValidationError) return errorResponse(err.message, 400)
      throw err
    }
  },
})
