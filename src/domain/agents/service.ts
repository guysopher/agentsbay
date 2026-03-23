// Agent service (for Phase 2)
import { db } from "@/lib/db"
import { NotFoundError, ValidationError, logError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import type { CreateAgentInput, UpdateAgentInput } from "./validation"

export class AgentService {
  // Create a new agent
  static async create(userId: string, data: CreateAgentInput) {
    try {
      // Check user's agent limit
      const existingAgents = await db.agent.count({
        where: {
          userId,
          isActive: true,
          deletedAt: null,
        },
      })

      if (existingAgents >= 5) {
        throw new ValidationError("Maximum 5 agents per user")
      }

      const agent = await db.$transaction(async (tx) => {
        const agent = await tx.agent.create({
          data: {
            userId,
            name: data.name,
            description: data.description,
            autoNegotiate: data.autoNegotiate,
            maxBidAmount: data.maxBidAmount,
            minAcceptAmount: data.minAcceptAmount,
            maxAcceptAmount: data.maxAcceptAmount,
            autoRejectBelow: data.autoRejectBelow,
            autoCounterEnabled: data.autoCounterEnabled,
            requireApproval: data.requireApproval,
            preferredLocation: data.preferredLocation,
            maxDistance: data.maxDistance,
          },
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            userId,
            agentId: agent.id,
            action: "agent.created",
            entityType: "agent",
            entityId: agent.id,
            metadata: { name: data.name },
          },
        })

        return agent
      })

      // Emit event
      await eventBus.emit("agent.created", {
        agentId: agent.id,
        userId,
        name: data.name,
      })

      return agent
    } catch (error) {
      logError(error, { userId, data })
      throw error
    }
  }

  // Get user's agents
  static async getUserAgents(userId: string) {
    return db.agent.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  // Get agent by ID
  static async getById(agentId: string, userId: string) {
    const agent = await db.agent.findFirst({
      where: {
        id: agentId,
        userId,
        deletedAt: null,
      },
    })

    if (!agent) {
      throw new NotFoundError("Agent")
    }

    return agent
  }

  // Update agent
  static async update(
    agentId: string,
    userId: string,
    data: UpdateAgentInput
  ) {
    try {
      const agent = await this.getById(agentId, userId)

      const updated = await db.$transaction(async (tx) => {
        const updated = await tx.agent.update({
          where: { id: agent.id },
          data,
        })

        await tx.auditLog.create({
          data: {
            userId,
            agentId: agent.id,
            action: "agent.updated",
            entityType: "agent",
            entityId: agent.id,
            metadata: { updates: Object.keys(data) },
          },
        })

        return updated
      })

      await eventBus.emit("agent.updated", { agentId: agent.id, userId })

      return updated
    } catch (error) {
      logError(error, { agentId, userId, data })
      throw error
    }
  }

  // Toggle agent active status
  static async toggleActive(agentId: string, userId: string) {
    try {
      const agent = await this.getById(agentId, userId)

      const updated = await db.$transaction(async (tx) => {
        const updated = await tx.agent.update({
          where: { id: agent.id },
          data: { isActive: !agent.isActive },
        })

        await tx.auditLog.create({
          data: {
            userId,
            agentId: agent.id,
            action: agent.isActive ? "agent.deactivated" : "agent.activated",
            entityType: "agent",
            entityId: agent.id,
          },
        })

        return updated
      })

      return updated
    } catch (error) {
      logError(error, { agentId, userId })
      throw error
    }
  }

  // Delete agent (soft delete)
  static async delete(agentId: string, userId: string) {
    try {
      const agent = await this.getById(agentId, userId)

      await db.$transaction(async (tx) => {
        await tx.agent.update({
          where: { id: agent.id },
          data: {
            deletedAt: new Date(),
            isActive: false,
          },
        })

        await tx.auditLog.create({
          data: {
            userId,
            agentId: agent.id,
            action: "agent.deleted",
            entityType: "agent",
            entityId: agent.id,
          },
        })
      })

      await eventBus.emit("agent.deleted", { agentId: agent.id, userId })
    } catch (error) {
      logError(error, { agentId, userId })
      throw error
    }
  }

  // Check if agent should auto-accept a bid
  static shouldAutoAccept(agent: any, bidAmount: number): boolean {
    if (!agent.autoNegotiate || agent.requireApproval) {
      return false
    }

    if (agent.minAcceptAmount && bidAmount < agent.minAcceptAmount) {
      return false
    }

    if (agent.maxAcceptAmount && bidAmount > agent.maxAcceptAmount) {
      return false
    }

    return true
  }

  // Check if agent should auto-reject a bid
  static shouldAutoReject(agent: any, bidAmount: number): boolean {
    if (!agent.autoNegotiate) {
      return false
    }

    if (agent.autoRejectBelow && bidAmount < agent.autoRejectBelow) {
      return true
    }

    return false
  }

  // Check if agent should auto-counter
  static shouldAutoCounter(agent: any, bidAmount: number): boolean {
    if (!agent.autoNegotiate || !agent.autoCounterEnabled) {
      return false
    }

    // Auto-counter if bid is between reject and accept thresholds
    if (agent.autoRejectBelow && bidAmount > agent.autoRejectBelow) {
      if (!agent.minAcceptAmount || bidAmount < agent.minAcceptAmount) {
        return true
      }
    }

    return false
  }
}
