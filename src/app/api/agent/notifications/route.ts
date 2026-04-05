import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NotificationService } from "@/lib/notifications/service"

export const { GET, PATCH } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const searchParams = req.nextUrl.searchParams
      const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1
      const pageSize = Math.min(
        searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 20,
        100
      )

      const [{ notifications, total }, unreadCount] = await Promise.all([
        NotificationService.list(auth.userId, page, pageSize),
        NotificationService.unreadCount(auth.userId),
      ])

      return successResponse({
        notifications,
        total,
        unreadCount,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      })
    } catch (error: unknown) {
      console.error("Agent notifications error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch notifications",
        500
      )
    }
  },

  PATCH: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const result = await NotificationService.markAllRead(auth.userId)

      return successResponse({ updated: result.count })
    } catch (error: unknown) {
      console.error("Agent notifications mark-all-read error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to mark notifications as read",
        500
      )
    }
  },
})
