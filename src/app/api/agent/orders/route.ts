import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { OrderService } from "@/domain/orders/service"
import { OrderStatus } from "@prisma/client"

export const { GET } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const searchParams = req.nextUrl.searchParams
      const statusParam = searchParams.get("status")
      const cursor = searchParams.get("cursor") || undefined
      const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 20

      const statusFilter = statusParam
        ? (statusParam.split(",").map((s) => s.trim()) as OrderStatus[])
        : undefined

      const { items, nextCursor, hasMore } = await OrderService.listByUser(auth.userId, {
        status: statusFilter,
        cursor,
        limit,
      })

      return successResponse({
        orders: items,
        nextCursor,
        hasMore,
      })
    } catch (error: unknown) {
      console.error("Agent list orders error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to list orders",
        500
      )
    }
  },
})
