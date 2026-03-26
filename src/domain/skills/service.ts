import { db } from "@/lib/db"
import { NotFoundError, ValidationError, logError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import { SkillExecutionStatus } from "@prisma/client"
import type {
  ExecuteSkillInput,
  SkillExecutionResult,
} from "./types"
import { skillRegistry } from "./registry"
import { randomUUID } from "crypto"

export class SkillService {
  /**
   * Get all available skills
   */
  static async getAllSkills() {
    return db.skill.findMany({
      where: { isActive: true },
      orderBy: { displayName: "asc" },
    })
  }

  /**
   * Get skill by ID
   */
  static async getSkillById(skillId: string) {
    const skill = await db.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new NotFoundError("Skill")
    }

    return skill
  }

  /**
   * Get skills enabled for an agent
   */
  static async getAgentSkills(agentId: string) {
    return db.agentSkill.findMany({
      where: {
        agentId,
        isEnabled: true,
      },
      include: {
        Skill: true,
      },
    })
  }

  /**
   * Enable a skill for an agent
   */
  static async enableSkillForAgent(
    agentId: string,
    skillId: string,
    settings?: Record<string, unknown>
  ) {
    try {
      // Verify skill exists
      await this.getSkillById(skillId)

      // Verify agent exists
      const agent = await db.agent.findUnique({
        where: { id: agentId },
      })

      if (!agent) {
        throw new NotFoundError("Agent")
      }

      const agentSkill = await db.agentSkill.upsert({
        where: {
          agentId_skillId: {
            agentId,
            skillId,
          },
        },
        create: {
          id: randomUUID(),
          agentId,
          skillId,
          isEnabled: true,
          updatedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings: settings as any,
        },
        update: {
          isEnabled: true,
          updatedAt: new Date(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settings: settings as any,
        },
        include: {
          Skill: true,
        },
      })

      return agentSkill
    } catch (error) {
      logError(error, { agentId, skillId })
      throw error
    }
  }

  /**
   * Disable a skill for an agent
   */
  static async disableSkillForAgent(agentId: string, skillId: string) {
    try {
      const agentSkill = await db.agentSkill.findUnique({
        where: {
          agentId_skillId: {
            agentId,
            skillId,
          },
        },
      })

      if (!agentSkill) {
        throw new NotFoundError("Agent skill configuration")
      }

      return db.agentSkill.update({
        where: {
          agentId_skillId: {
            agentId,
            skillId,
          },
        },
        data: {
          isEnabled: false,
          updatedAt: new Date(),
        },
      })
    } catch (error) {
      logError(error, { agentId, skillId })
      throw error
    }
  }

  /**
   * Execute a skill
   */
  static async executeSkill(
    params: ExecuteSkillInput
  ): Promise<SkillExecutionResult> {
    const { skillId, agentId, input } = params
    const startTime = Date.now()

    try {
      // Verify agent has this skill enabled
      const agentSkill = await db.agentSkill.findUnique({
        where: {
          agentId_skillId: {
            agentId,
            skillId,
          },
        },
        include: {
          Skill: true,
        },
      })

      if (!agentSkill || !agentSkill.isEnabled) {
        throw new ValidationError("Skill not enabled for this agent")
      }

      // Get skill implementation from registry
      const skillImpl = skillRegistry.get(agentSkill.Skill.name)
      if (!skillImpl) {
        throw new ValidationError("Skill implementation not found")
      }

      // Validate input
      const validation = skillImpl.validateInput(input)
      if (!validation.valid) {
        throw new ValidationError(
          `Invalid input: ${validation.errors?.join(", ")}`
        )
      }

      // Create execution record
      const execution = await db.skillExecution.create({
        data: {
          id: randomUUID(),
          agentId,
          skillId,
          input,
          status: SkillExecutionStatus.RUNNING,
          updatedAt: new Date(),
        },
      })

      try {
        // Execute the skill
        const output = await skillImpl.execute(input, agentId)
        const duration = Date.now() - startTime

        // Calculate cost (if applicable)
        const cost = agentSkill.Skill.costPerExecution

        // Update execution record
        const updatedExecution = await db.skillExecution.update({
          where: { id: execution.id },
          data: {
            status: output.success
              ? SkillExecutionStatus.COMPLETED
              : SkillExecutionStatus.FAILED,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: output as any,
            error: output.error,
            duration,
            cost,
            updatedAt: new Date(),
          },
        })

        // Emit event
        await eventBus.emit("skill.executed", {
          executionId: execution.id,
          agentId,
          skillId,
          success: output.success,
        })

        return {
          id: updatedExecution.id,
          status: updatedExecution.status,
          output,
          duration,
          cost: cost || undefined,
        }
      } catch (executionError) {
        const duration = Date.now() - startTime

        // Update execution record with error
        await db.skillExecution.update({
          where: { id: execution.id },
          data: {
            status: SkillExecutionStatus.FAILED,
            error:
              executionError instanceof Error
                ? executionError.message
                : "Unknown error",
            duration,
            updatedAt: new Date(),
          },
        })

        throw executionError
      }
    } catch (error) {
      logError(error, { agentId, skillId, input })
      throw error
    }
  }

  /**
   * Get execution history for an agent
   */
  static async getExecutionHistory(
    agentId: string,
    options?: {
      skillId?: string
      status?: SkillExecutionStatus
      limit?: number
    }
  ) {
    const where: {
      agentId: string
      skillId?: string
      status?: SkillExecutionStatus
    } = { agentId }

    if (options?.skillId) {
      where.skillId = options.skillId
    }

    if (options?.status) {
      where.status = options.status
    }

    return db.skillExecution.findMany({
      where,
      include: {
        Skill: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: options?.limit || 50,
    })
  }

  /**
   * Get execution statistics for an agent
   */
  static async getExecutionStats(agentId: string, skillId?: string) {
    const where: {
      agentId: string
      skillId?: string
    } = { agentId }
    if (skillId) {
      where.skillId = skillId
    }

    const [total, completed, failed, totalCost] = await Promise.all([
      db.skillExecution.count({ where }),
      db.skillExecution.count({
        where: { ...where, status: SkillExecutionStatus.COMPLETED },
      }),
      db.skillExecution.count({
        where: { ...where, status: SkillExecutionStatus.FAILED },
      }),
      db.skillExecution.aggregate({
        where: { ...where, status: SkillExecutionStatus.COMPLETED },
        _sum: { cost: true },
      }),
    ])

    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? (completed / total) * 100 : 0,
      totalCost: totalCost._sum.cost || 0,
    }
  }
}
