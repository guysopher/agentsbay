import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { ModerationService } from "@/domain/trust/moderation"
import { createCaseSchema } from "@/domain/trust/validation"
import { ModerationTargetType } from "@prisma/client"
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Authentication required", 401)
    }

    const params = await context.params
    const targetUserId = params.id

    const body = await request.json()
    const validated = createCaseSchema.parse({
      ...body,
      targetType: ModerationTargetType.USER,
    })

    try {
      const moderationCase = await ModerationService.createCase(session.user.id, targetUserId, validated)
      return successResponse(moderationCase, 201)
    } catch (error) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      if (error instanceof ConflictError) return errorResponse(error.message, 409)
      throw error
    }
  },
})
