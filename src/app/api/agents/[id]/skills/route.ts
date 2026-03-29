import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"
import { z } from "zod"

const enableSkillSchema = z.object({
  skillId: z.string(),
  settings: z.any().optional(),
})

export const { GET, POST, DELETE } = createApiHandler({
  GET: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const params = await context.params
    const agentId = params.id

    const skills = await SkillService.getAgentSkills(agentId)

    return successResponse(skills)
  },

  POST: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const params = await context.params
    const agentId = params.id
    const body = await request.json()
    const validated = enableSkillSchema.parse(body)

    const agentSkill = await SkillService.enableSkillForAgent(
      agentId,
      validated.skillId,
      validated.settings
    )

    return successResponse(agentSkill, 201)
  },

  DELETE: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const params = await context.params
    const agentId = params.id
    const { searchParams } = request.nextUrl
    const skillId = searchParams.get("skillId")

    if (!skillId) {
      throw new UnauthorizedError("skillId is required")
    }

    await SkillService.disableSkillForAgent(agentId, skillId)

    return successResponse({ success: true })
  },
})
