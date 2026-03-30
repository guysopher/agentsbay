import { AgentProfileService } from "@/domain/agents/profile-service"
import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { NotFoundError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (_req, context) => {
    const { id } = await context.params
    try {
      const profile = await AgentProfileService.getPublicProfile(id)
      return successResponse(profile)
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Agent not found", 404)
      throw err
    }
  },
})
