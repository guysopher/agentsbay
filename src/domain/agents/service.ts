import { db } from "@/lib/db"
import { NotFoundError, ValidationError, logError } from "@/lib/errors"
import { eventBus } from "@/lib/events"
import type { Agent } from "@prisma/client"
import type { CreateAgentInput, UpdateAgentInput } from "./validation"

/**
 * Service for managing AI agents
 * Handles agent creation, configuration, and autonomous negotiation logic
 */
export class AgentService {
  /**
   * Create a new agent for a user (max 5 per user)
   * @param userId - ID of the user creating the agent
   * @param data - Agent configuration (name, negotiation settings, approval requirements)
   * @returns Created agent
   * @throws {ValidationError} If user already has 5 agents
   * @emits agent.created
   * @example
   * ```ts
   * const agent = await AgentService.create(userId, {
   *   name: "My Shopping Agent",
   *   description: "Finds deals on electronics",
   *   autoNegotiate: true,
   *   maxBidAmount: 100000, // $1000 max
   *   minAcceptAmount: 50000, // Auto-accept above $500
   *   autoRejectBelow: 10000 // Auto-reject below $100
   * })
   * ```
   */
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

  /**
   * Get all agents belonging to a user (excludes soft-deleted)
   * @param userId - ID of the user
   * @returns Array of user's agents, sorted by creation date (newest first)
   * @example
   * ```ts
   * const myAgents = await AgentService.getUserAgents(userId)
   * ```
   */
  static async getUserAgents(userId: string) {
    return db.agent.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    })
  }

  /**
   * Get a specific agent by ID
   * @param agentId - ID of the agent
   * @param userId - ID of the user (must be agent owner)
   * @returns Agent object
   * @throws {NotFoundError} If agent doesn't exist, doesn't belong to user, or was deleted
   * @example
   * ```ts
   * const agent = await AgentService.getById(agentId, userId)
   * ```
   */
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

  /**
   * Update an existing agent's configuration
   * @param agentId - ID of the agent to update
   * @param userId - ID of the user (must be agent owner)
   * @param data - Partial agent data to update
   * @returns Updated agent
   * @throws {NotFoundError} If agent doesn't exist or doesn't belong to user
   * @emits agent.updated
   * @example
   * ```ts
   * await AgentService.update(agentId, userId, {
   *   name: "Updated Agent Name",
   *   maxBidAmount: 200000
   * })
   * ```
   */
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

  /**
   * Toggle agent's active status (enable/disable agent)
   * @param agentId - ID of the agent
   * @param userId - ID of the user (must be agent owner)
   * @returns Updated agent with toggled status
   * @throws {NotFoundError} If agent doesn't exist or doesn't belong to user
   * @example
   * ```ts
   * await AgentService.toggleActive(agentId, userId) // Deactivate if active, activate if inactive
   * ```
   */
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

  /**
   * Delete an agent (soft delete - marks as deleted and deactivates)
   * @param agentId - ID of the agent to delete
   * @param userId - ID of the user (must be agent owner)
   * @throws {NotFoundError} If agent doesn't exist or doesn't belong to user
   * @emits agent.deleted
   * @example
   * ```ts
   * await AgentService.delete(agentId, userId)
   * ```
   */
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

  /**
   * Check if agent should automatically accept a bid
   * Returns true if auto-negotiate is enabled, no approval required,
   * and bid amount is within the agent's acceptance range
   * @param agent - Agent configuration
   * @param bidAmount - Bid amount in minor currency units (cents)
   * @returns true if bid should be auto-accepted
   * @example
   * ```ts
   * if (AgentService.shouldAutoAccept(agent, 75000)) {
   *   // Auto-accept $750 bid
   * }
   * ```
   */
  static shouldAutoAccept(agent: Agent, bidAmount: number): boolean {
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

  /**
   * Check if agent should automatically reject a bid
   * Returns true if auto-negotiate is enabled and bid is below rejection threshold
   * @param agent - Agent configuration
   * @param bidAmount - Bid amount in minor currency units (cents)
   * @returns true if bid should be auto-rejected
   * @example
   * ```ts
   * if (AgentService.shouldAutoReject(agent, 5000)) {
   *   // Auto-reject $50 bid (below threshold)
   * }
   * ```
   */
  static shouldAutoReject(agent: Agent, bidAmount: number): boolean {
    if (!agent.autoNegotiate) {
      return false
    }

    if (agent.autoRejectBelow && bidAmount < agent.autoRejectBelow) {
      return true
    }

    return false
  }

  /**
   * Check if agent should automatically make a counter-offer
   * Returns true if bid is above rejection threshold but below acceptance threshold
   * @param agent - Agent configuration
   * @param bidAmount - Bid amount in minor currency units (cents)
   * @returns true if agent should make a counter-offer
   * @example
   * ```ts
   * if (AgentService.shouldAutoCounter(agent, 40000)) {
   *   // Make counter-offer for $400 bid (between reject and accept thresholds)
   * }
   * ```
   */
  static shouldAutoCounter(agent: Agent, bidAmount: number): boolean {
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
