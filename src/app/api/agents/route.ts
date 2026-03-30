import { AgentService } from "@/domain/agents/service"
import { createAgentSchema } from "@/domain/agents/validation"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"

export const { GET, POST } = createApiHandler({
  GET: async () => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in to view your agents")
    }

    const agents = await AgentService.getUserAgents(session.user.id)
    return successResponse(agents)
  },

  POST: async (request) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("You must be logged in to create an agent")
    }

    const body = await request.json()
    const validated = createAgentSchema.parse(body)
    const agent = await AgentService.create(session.user.id, validated)
    return successResponse(agent, 201)
  },
})
