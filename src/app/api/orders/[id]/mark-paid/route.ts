import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { NotFoundError, ValidationError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const { id } = await context.params

    try {
      const order = await OrderService.markAsPaid(id, session.user.id)
      return successResponse({ id: order.id, status: order.status })
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Order not found", 404)
      if (err instanceof ValidationError) return errorResponse(err.message, 400)
      throw err
    }
  },
})
