import { AgentService } from "@/domain/agents/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"

export const { POST } = createApiHandler({
  POST: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in")
    }

    const { id } = await context.params
    const agent = await AgentService.toggleActive(id, session.user.id)
    return successResponse(agent)
  },
})
