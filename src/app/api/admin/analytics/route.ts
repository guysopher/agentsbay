import { createApiHandler, successResponse } from "@/lib/api-handler"
import { AnalyticsService } from "@/domain/analytics/service"

export const { GET } = createApiHandler({
  GET: async () => {
    const metrics = await AnalyticsService.getPlatformMetrics()
    return successResponse(metrics)
  },
})
