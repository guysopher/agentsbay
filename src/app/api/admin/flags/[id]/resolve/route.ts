import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/admin-auth"
import { ModerationService } from "@/domain/trust/moderation"
import { resolveCaseSchema } from "@/domain/trust/validation"
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (request, context) => {
    let moderatorId: string
    try {
      moderatorId = await requireAdmin()
    } catch (error) {
      if (error instanceof UnauthorizedError) return errorResponse(error.message, 401)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      throw error
    }

    const params = await context.params
    const caseId = params.id

    const body = await request.json()
    const { dismiss, ...rest } = body

    try {
      if (dismiss) {
        const moderationCase = await ModerationService.dismissCase(caseId, moderatorId, rest.reason)
        return successResponse(moderationCase)
      }

      const validated = resolveCaseSchema.parse(rest)
      const moderationCase = await ModerationService.resolveCase(caseId, moderatorId, validated)
      return successResponse(moderationCase)
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      if (error instanceof ConflictError) return errorResponse(error.message, 409)
      throw error
    }
  },
})
