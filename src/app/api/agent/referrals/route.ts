import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReferralService } from "@/domain/referral/service"

export const { GET } = createApiHandler({
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const stats = await ReferralService.getStats(auth.userId)

      return successResponse(stats)
    } catch (error: unknown) {
      console.error("Agent referrals error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch referral data",
        500
      )
    }
  },
})
