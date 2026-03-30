import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/admin-auth"
import { ModerationService } from "@/domain/trust/moderation"
import { listCasesSchema } from "@/domain/trust/validation"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (request) => {
    try {
      await requireAdmin()
    } catch (error) {
      if (error instanceof UnauthorizedError) return errorResponse(error.message, 401)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      throw error
    }

    const { searchParams } = request.nextUrl
    const filters = listCasesSchema.parse({
      status: searchParams.get("status") || undefined,
      targetType: searchParams.get("targetType") || undefined,
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || 20,
    })

    const result = await ModerationService.getCases(filters)
    return successResponse(result)
  },
})
