import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (request) => {
    // Authentication optional for viewing skills
    const session = await auth()

    const skills = await SkillService.getAllSkills()

    return successResponse(skills)
  },
})
