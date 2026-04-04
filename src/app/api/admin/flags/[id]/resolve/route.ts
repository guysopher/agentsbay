import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { ModerationService } from "@/domain/trust/moderation"
import { resolveCaseSchema } from "@/domain/trust/validation"
import { ConflictError, NotFoundError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (request, context) => {
    const params = await context.params
    const caseId = params.id

    const body = await request.json()
    const { dismiss, ...rest } = body

    try {
      if (dismiss) {
        const moderationCase = await ModerationService.dismissCase(caseId, "admin", rest.reason)
        return successResponse(moderationCase)
      }

      const validated = resolveCaseSchema.parse(rest)
      const moderationCase = await ModerationService.resolveCase(caseId, "admin", validated)
      return successResponse(moderationCase)
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      if (error instanceof ConflictError) return errorResponse(error.message, 409)
      throw error
    }
  },
})
