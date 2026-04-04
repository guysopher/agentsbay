import { createApiHandler, successResponse } from "@/lib/api-handler"
import { ModerationService } from "@/domain/trust/moderation"
import { listCasesSchema } from "@/domain/trust/validation"

export const { GET } = createApiHandler({
  GET: async (request) => {
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
