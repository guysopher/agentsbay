import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReviewService } from "@/domain/reviews/service"

export const { GET } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const searchParams = req.nextUrl.searchParams
      const cursor = searchParams.get("cursor") ?? undefined
      const limit = Math.min(
        searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20,
        100
      )

      const result = await ReviewService.getReviewsForUser(auth.userId, { cursor, limit })

      return successResponse(result)
    } catch (error: unknown) {
      console.error("Agent reviews error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch reviews",
        500
      )
    }
  },
})
