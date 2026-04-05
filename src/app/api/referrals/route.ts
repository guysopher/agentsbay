import { createApiHandler, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReferralService } from "@/domain/referral/service"

export const { GET } = createApiHandler({
  GET: async (req) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }
    const { auth } = authResult

    const stats = await ReferralService.getStats(auth.userId)
    return successResponse(stats)
  },
})
