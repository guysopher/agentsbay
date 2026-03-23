import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"
import { rateLimiter } from "@/lib/rate-limit"
import { z } from "zod"

const executeSkillSchema = z.object({
  skillId: z.string(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: z.any(),
})

export const { POST } = createApiHandler({
  POST: async (request, context) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError()
    }

    const params = await context.params
    const agentId = params.agentId

    // Rate limiting - max 30 skill executions per hour
    await rateLimiter.check(
      `skill-exec:${agentId}`,
      { maxRequests: 30, windowMs: 60 * 60 * 1000 }
    )

    const body = await request.json()
    const validated = executeSkillSchema.parse(body)

    const result = await SkillService.executeSkill({
      agentId,
      skillId: validated.skillId,
      input: validated.input,
    })

    return successResponse(result)
  },
})
