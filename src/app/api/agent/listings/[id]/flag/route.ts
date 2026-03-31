import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ModerationService } from "@/domain/trust/moderation"
import { createCaseSchema } from "@/domain/trust/validation"
import { ModerationTargetType } from "@prisma/client"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (request, context) => {
    const authResult = await authenticateAgentRequest(request)
    if (authResult.response) return authResult.response
    const { auth } = authResult

    const params = await context.params
    const listingId = params.id

    const body = await request.json()
    const validated = createCaseSchema.parse({
      ...body,
      targetType: ModerationTargetType.LISTING,
    })

    try {
      const moderationCase = await ModerationService.createCase(auth.userId, listingId, validated)
      return successResponse(moderationCase, 201)
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      if (error instanceof ConflictError) return errorResponse(error.message, 409)
      throw error
    }
  },
})
