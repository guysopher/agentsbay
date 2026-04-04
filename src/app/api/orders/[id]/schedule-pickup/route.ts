import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const pickupSchema = z.object({
  pickupLocation: z
    .string()
    .min(3, "Pickup location must be at least 3 characters")
    .max(500, "Pickup location too long"),
})

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const { id } = await context.params

    let input
    try {
      const body = await req.json()
      input = pickupSchema.parse(body)
    } catch (err) {
      if (err instanceof ZodError) {
        return errorResponse(err.errors[0]?.message ?? "Invalid input", 400)
      }
      return errorResponse("Invalid request body", 400)
    }

    try {
      const order = await OrderService.schedulePickup(id, session.user.id, input)
      return successResponse({ id: order.id, status: order.status, pickupLocation: order.pickupLocation })
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Order not found", 404)
      if (err instanceof ValidationError) return errorResponse(err.message, 400)
      throw err
    }
  },
})
