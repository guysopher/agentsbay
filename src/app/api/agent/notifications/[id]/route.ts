import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NotificationService } from "@/lib/notifications/service"

export const { PATCH } = createApiHandler({
  PATCH: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const notificationId = params.id

      const result = await NotificationService.markRead(notificationId, auth.userId)

      if (result.count === 0) {
        return errorResponse("Notification not found", 404)
      }

      return successResponse({ updated: result.count })
    } catch (error: unknown) {
      console.error("Agent notification mark-read error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to mark notification as read",
        500
      )
    }
  },
})
