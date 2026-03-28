import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReviewService } from "@/domain/reviews/service"

export const { GET } = createApiHandler({
  GET: async (req, context) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }

    const params = await context.params
    const { searchParams } = req.nextUrl

    const cursor = searchParams.get("cursor") ?? undefined
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20

    try {
      const result = await ReviewService.getReviewsForUser(params.id, { cursor, limit })

      return successResponse({
        reviews: result.items,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        meta: {
          averageRating: result.averageRating,
          totalReviews: result.totalReviews,
        },
      })
    } catch (error: unknown) {
      console.error("Agent get user reviews error:", error)
      return errorResponse(error instanceof Error ? error.message : "Failed to fetch reviews", 500)
    }
  },
})
