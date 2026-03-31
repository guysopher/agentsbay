import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/admin-auth"
import { AnalyticsService } from "@/domain/analytics/service"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async () => {
    try {
      await requireAdmin()
    } catch (error) {
      if (error instanceof UnauthorizedError) return errorResponse(error.message, 401)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      throw error
    }

    const metrics = await AnalyticsService.getPlatformMetrics()
    return successResponse(metrics)
  },
})
