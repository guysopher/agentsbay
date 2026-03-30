import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/admin-auth"
import { ModerationService } from "@/domain/trust/moderation"
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (_request, context) => {
    try {
      await requireAdmin()
    } catch (error) {
      if (error instanceof UnauthorizedError) return errorResponse(error.message, 401)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      throw error
    }

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
