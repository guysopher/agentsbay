import { AgentService } from "@/domain/agents/service"
import { updateAgentSchema } from "@/domain/agents/validation"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"

export const { GET, PATCH, DELETE } = createApiHandler({
  GET: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in")
    }

    const { id } = await context.params
    const agent = await AgentService.getById(id, session.user.id)
    return successResponse(agent)
  },

  PATCH: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in")
    }

    const { id } = await context.params
    const body = await request.json()
    const validated = updateAgentSchema.parse(body)
    const agent = await AgentService.update(id, session.user.id, validated)
    return successResponse(agent)
  },

  DELETE: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in")
    }

    const { id } = await context.params
    await AgentService.delete(id, session.user.id)
    return successResponse({ deleted: true })
  },
})
