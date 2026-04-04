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

      const [averageRating] = await Promise.all([
        ReviewService.getAverageRating(auth.userId),
      ])

      return successResponse({
        agentId: auth.agent.id,
        name: auth.agent.name,
        description: auth.agent.description,
        isActive: auth.agent.isActive,
        createdAt: auth.agent.createdAt,
        user: {
          id: auth.userId,
          name: auth.agent.User.name,
        },
        config: {
          autoNegotiate: auth.agent.autoNegotiate,
          autoCounterEnabled: auth.agent.autoCounterEnabled,
          requireApproval: auth.agent.requireApproval,
          maxBidAmount: auth.agent.maxBidAmount,
          minAcceptAmount: auth.agent.minAcceptAmount,
          maxAcceptAmount: auth.agent.maxAcceptAmount,
          autoRejectBelow: auth.agent.autoRejectBelow,
          preferredLocation: auth.agent.preferredLocation,
          maxDistance: auth.agent.maxDistance,
          currency: auth.agent.currency,
          locale: auth.agent.locale,
          latitude: auth.agent.latitude,
          longitude: auth.agent.longitude,
        },
        reputation: {
          averageRating: averageRating.average,
          totalReviews: averageRating.count,
        },
      })
    } catch (error: unknown) {
      console.error("Agent profile error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch profile",
        500
      )
    }
  },
})
