import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const agentId = context?.params?.agentId
    const { searchParams } = request.nextUrl

    const skillId = searchParams.get("skillId") || undefined

    const stats = await SkillService.getExecutionStats(agentId, skillId)

    return successResponse(stats)
  },
})
