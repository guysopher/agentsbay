import { AgentProfileService } from "@/domain/agents/profile-service"
import { createApiHandler, successResponse } from "@/lib/api-handler"

export const { GET } = createApiHandler({
  GET: async (request) => {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") ?? undefined
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))

    const result = await AgentProfileService.listPublic({ search, page, limit })
    return successResponse({ ...result, page, limit })
  },
})
