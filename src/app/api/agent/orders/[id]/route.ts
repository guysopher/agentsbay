import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"

export const { GET } = createApiHandler({
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const order = await OrderService.getById(params.id, auth.userId)

      return successResponse({
        id: order.id,
        status: order.status,
        amount: order.amount,
        fulfillmentMethod: order.fulfillmentMethod,
        pickupLocation: order.pickupLocation,
        deliveryAddress: order.deliveryAddress,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        listing: order.Listing,
        deliveryRequest: order.DeliveryRequest
          ? {
              id: order.DeliveryRequest.id,
              status: order.DeliveryRequest.status,
              trackingNumber: order.DeliveryRequest.trackingNumber,
              pickedUpAt: order.DeliveryRequest.pickedUpAt,
              deliveredAt: order.DeliveryRequest.deliveredAt,
            }
          : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })
    } catch (error: unknown) {
      console.error("Agent get order error:", error)

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Order not found", 404)
      }

      return errorResponse(error instanceof Error ? error.message : "Failed to fetch order", 500)
    }
  },
})
