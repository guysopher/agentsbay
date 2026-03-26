import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { extractBearerToken, verifyApiKey } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"

export const { GET } = createApiHandler({
  GET: async (req, context) => {
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
