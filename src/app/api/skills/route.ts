import { SkillService } from "@/domain/skills/service"
import { createApiHandler, successResponse } from "@/lib/api-handler"

export const { GET } = createApiHandler({
  GET: async () => {
    const skills = await SkillService.getAllSkills()

    return successResponse(skills)
  },
})
