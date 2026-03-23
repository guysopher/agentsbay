import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"
import { SkillExecutionStatus } from "@prisma/client"

export const { GET } = createApiHandler({
  GET: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const agentId = context?.params?.agentId
    const { searchParams } = request.nextUrl

    const options: any = {}

    const skillId = searchParams.get("skillId")
    if (skillId) {
      options.skillId = skillId
    }

    const status = searchParams.get("status")
    if (status && Object.values(SkillExecutionStatus).includes(status as any)) {
      options.status = status as SkillExecutionStatus
    }

    const limit = searchParams.get("limit")
    if (limit) {
      options.limit = parseInt(limit, 10)
    }

    const history = await SkillService.getExecutionHistory(agentId, options)

    return successResponse(history)
  },
})
