import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { ModerationService } from "@/domain/trust/moderation"
import { NotFoundError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (_request, context) => {
    const params = await context.params
    const caseId = params.id

    try {
      const moderationCase = await ModerationService.getCaseById(caseId)
      return successResponse(moderationCase)
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      throw error
    }
  },
})
