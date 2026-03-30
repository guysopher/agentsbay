/**
 * AgentService — unit tests with mocked Prisma
 *
 * Covers all lifecycle operations: create, getUserAgents, getById,
 * update, toggleActive, delete, shouldAutoAccept, shouldAutoReject, shouldAutoCounter.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { db } from "@/lib/db"
import { AgentService } from "@/domain/agents/service"
import { NotFoundError, ValidationError } from "@/lib/errors"
import type { Agent } from "@prisma/client"

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

const USER_ID = "user-1"
const AGENT_ID = "agent-1"

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: AGENT_ID,
    userId: USER_ID,
    name: "Test Agent",
    description: "A test agent",
    isActive: true,
    autoNegotiate: false,
    maxBidAmount: null,
    minAcceptAmount: null,
    maxAcceptAmount: null,
    autoRejectBelow: null,
    autoCounterEnabled: false,
    requireApproval: true,
    preferredLocation: null,
    maxDistance: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  } as Agent
}

describe("AgentService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── create ─────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("should create an agent successfully", async () => {
      const created = makeAgent()
      jest.spyOn(db.agent, "count").mockResolvedValueOnce(0 as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { create: jest.fn().mockResolvedValue(created) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await AgentService.create(USER_ID, {
        name: "Test Agent",
        autoNegotiate: false,
        autoCounterEnabled: false,
        requireApproval: true,
      })

      expect(result).toBeDefined()
      expect((result as Agent).name).toBe("Test Agent")
      expect((result as Agent).userId).toBe(USER_ID)
    })

    it("should throw ValidationError when user already has 5 agents", async () => {
      jest.spyOn(db.agent, "count").mockResolvedValueOnce(5 as never)

      await expect(
        AgentService.create(USER_ID, {
          name: "Sixth Agent",
          autoNegotiate: false,
          autoCounterEnabled: false,
          requireApproval: true,
        })
      ).rejects.toThrow(ValidationError)
    })

    it("should throw ValidationError with correct message at limit of 5", async () => {
      jest.spyOn(db.agent, "count").mockResolvedValueOnce(5 as never)

      await expect(
        AgentService.create(USER_ID, {
          name: "Extra Agent",
          autoNegotiate: false,
          autoCounterEnabled: false,
          requireApproval: true,
        })
      ).rejects.toThrow("Maximum 5 agents per user")
    })

    it("should allow creation when user has fewer than 5 agents", async () => {
      const created = makeAgent({ name: "Agent 4" })
      jest.spyOn(db.agent, "count").mockResolvedValueOnce(4 as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { create: jest.fn().mockResolvedValue(created) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await AgentService.create(USER_ID, {
        name: "Agent 4",
        autoNegotiate: false,
        autoCounterEnabled: false,
        requireApproval: true,
      })

      expect((result as Agent).name).toBe("Agent 4")
    })
  })

  // ── getUserAgents ──────────────────────────────────────────────────────────

  describe("getUserAgents", () => {
    it("should return all agents for a user", async () => {
      const agents = [makeAgent({ id: "a-1" }), makeAgent({ id: "a-2" })]
      jest.spyOn(db.agent, "findMany").mockResolvedValueOnce(agents as never)

      const result = await AgentService.getUserAgents(USER_ID)

      expect(result).toHaveLength(2)
      expect((result[0] as Agent).userId).toBe(USER_ID)
    })

    it("should return empty array when user has no agents", async () => {
      jest.spyOn(db.agent, "findMany").mockResolvedValueOnce([] as never)

      const result = await AgentService.getUserAgents(USER_ID)

      expect(result).toHaveLength(0)
    })

    it("should filter by userId (not return other users' agents)", async () => {
      const findManySpy = jest
        .spyOn(db.agent, "findMany")
        .mockResolvedValueOnce([] as never)

      await AgentService.getUserAgents(USER_ID)

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: USER_ID }),
        })
      )
    })

    it("should exclude soft-deleted agents", async () => {
      const findManySpy = jest
        .spyOn(db.agent, "findMany")
        .mockResolvedValueOnce([] as never)

      await AgentService.getUserAgents(USER_ID)

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      )
    })
  })

  // ── getById ────────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("should return agent when found", async () => {
      const agent = makeAgent()
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(agent as never)

      const result = await AgentService.getById(AGENT_ID, USER_ID)

      expect((result as Agent).id).toBe(AGENT_ID)
      expect((result as Agent).userId).toBe(USER_ID)
    })

    it("should throw NotFoundError when agent does not exist", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.getById("non-existent-id", USER_ID)
      ).rejects.toThrow(NotFoundError)
    })

    it("should throw NotFoundError when agent belongs to different user", async () => {
      // findFirst returns null because userId filter won't match
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.getById(AGENT_ID, "other-user")
      ).rejects.toThrow(NotFoundError)
    })

    it("should throw NotFoundError for soft-deleted agent", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.getById(AGENT_ID, USER_ID)
      ).rejects.toThrow(NotFoundError)
    })
  })

  // ── update ─────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("should update agent fields", async () => {
      const existing = makeAgent()
      const updated = makeAgent({ name: "Updated Name", maxBidAmount: 50000 })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(existing as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: jest.fn().mockResolvedValue(updated) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await AgentService.update(AGENT_ID, USER_ID, {
        name: "Updated Name",
        maxBidAmount: 50000,
      })

      expect((result as Agent).name).toBe("Updated Name")
      expect((result as Agent).maxBidAmount).toBe(50000)
    })

    it("should throw NotFoundError when agent does not exist", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.update("non-existent-id", USER_ID, { name: "New Name" })
      ).rejects.toThrow(NotFoundError)
    })

    it("should only update provided fields (partial update)", async () => {
      const existing = makeAgent()
      const updated = makeAgent({ name: "Only Name Changed" })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(existing as never)
      const agentUpdateSpy = jest.fn().mockResolvedValue(updated)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: agentUpdateSpy },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      await AgentService.update(AGENT_ID, USER_ID, { name: "Only Name Changed" })

      const updateCall = agentUpdateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
      expect(updateCall.data).toHaveProperty("name", "Only Name Changed")
    })
  })

  // ── toggleActive ───────────────────────────────────────────────────────────

  describe("toggleActive", () => {
    it("should deactivate an active agent", async () => {
      const active = makeAgent({ isActive: true })
      const deactivated = makeAgent({ isActive: false })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(active as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: jest.fn().mockResolvedValue(deactivated) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await AgentService.toggleActive(AGENT_ID, USER_ID)

      expect((result as Agent).isActive).toBe(false)
    })

    it("should activate an inactive agent", async () => {
      const inactive = makeAgent({ isActive: false })
      const activated = makeAgent({ isActive: true })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(inactive as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: jest.fn().mockResolvedValue(activated) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      const result = await AgentService.toggleActive(AGENT_ID, USER_ID)

      expect((result as Agent).isActive).toBe(true)
    })

    it("should throw NotFoundError when agent does not exist", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.toggleActive("non-existent-id", USER_ID)
      ).rejects.toThrow(NotFoundError)
    })

    it("should flip the isActive flag (not hard-code a value)", async () => {
      const active = makeAgent({ isActive: true })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(active as never)
      const agentUpdateSpy = jest.fn().mockResolvedValue(makeAgent({ isActive: false }))
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: agentUpdateSpy },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      await AgentService.toggleActive(AGENT_ID, USER_ID)

      const updateCall = agentUpdateSpy.mock.calls[0][0] as { data: { isActive: boolean } }
      expect(updateCall.data.isActive).toBe(false) // flipped from true
    })
  })

  // ── delete ─────────────────────────────────────────────────────────────────

  describe("delete", () => {
    it("should soft delete an agent (sets deletedAt, not removes row)", async () => {
      const existing = makeAgent()
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(existing as never)
      const agentUpdateSpy = jest.fn().mockResolvedValue({
        ...existing,
        deletedAt: new Date(),
        isActive: false,
      })
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: agentUpdateSpy },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      await AgentService.delete(AGENT_ID, USER_ID)

      const updateCall = agentUpdateSpy.mock.calls[0][0] as { data: Record<string, unknown> }
      expect(updateCall.data).toHaveProperty("deletedAt")
      expect(updateCall.data.deletedAt).toBeDefined()
    })

    it("should set isActive to false on delete", async () => {
      const existing = makeAgent({ isActive: true })
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(existing as never)
      const agentUpdateSpy = jest.fn().mockResolvedValue({})
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: agentUpdateSpy },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      await AgentService.delete(AGENT_ID, USER_ID)

      const updateCall = agentUpdateSpy.mock.calls[0][0] as { data: { isActive: boolean } }
      expect(updateCall.data.isActive).toBe(false)
    })

    it("should throw NotFoundError when agent does not exist", async () => {
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(null as never)

      await expect(
        AgentService.delete("non-existent-id", USER_ID)
      ).rejects.toThrow(NotFoundError)
    })

    it("should not hard-delete (no db.agent.delete call)", async () => {
      const existing = makeAgent()
      jest.spyOn(db.agent, "findFirst").mockResolvedValueOnce(existing as never)
      const hardDeleteSpy = jest.spyOn(db.agent, "delete")
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          agent: { update: jest.fn().mockResolvedValue({}) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        })
      })

      await AgentService.delete(AGENT_ID, USER_ID)

      expect(hardDeleteSpy).not.toHaveBeenCalled()
    })
  })

  // ── shouldAutoAccept ───────────────────────────────────────────────────────

  describe("shouldAutoAccept", () => {
    it("should return false when autoNegotiate is disabled", () => {
      const agent = makeAgent({ autoNegotiate: false, requireApproval: false })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(false)
    })

    it("should return false when requireApproval is true", () => {
      const agent = makeAgent({ autoNegotiate: true, requireApproval: true })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(false)
    })

    it("should return true when autoNegotiate enabled, no approval required, no thresholds", () => {
      const agent = makeAgent({ autoNegotiate: true, requireApproval: false })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(true)
    })

    it("should return false when bid is below minAcceptAmount", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        requireApproval: false,
        minAcceptAmount: 80000,
      })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(false)
    })

    it("should return true when bid meets minAcceptAmount", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        requireApproval: false,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(true)
    })

    it("should return false when bid exceeds maxAcceptAmount", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        requireApproval: false,
        maxAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(false)
    })

    it("should return true when bid is within min/max accept range", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        requireApproval: false,
        minAcceptAmount: 50000,
        maxAcceptAmount: 100000,
      })
      expect(AgentService.shouldAutoAccept(agent, 75000)).toBe(true)
    })
  })

  // ── shouldAutoReject ───────────────────────────────────────────────────────

  describe("shouldAutoReject", () => {
    it("should return false when autoNegotiate is disabled", () => {
      const agent = makeAgent({ autoNegotiate: false, autoRejectBelow: 20000 })
      expect(AgentService.shouldAutoReject(agent, 5000)).toBe(false)
    })

    it("should return true when bid is below autoRejectBelow threshold", () => {
      const agent = makeAgent({ autoNegotiate: true, autoRejectBelow: 20000 })
      expect(AgentService.shouldAutoReject(agent, 5000)).toBe(true)
    })

    it("should return false when bid equals autoRejectBelow threshold", () => {
      const agent = makeAgent({ autoNegotiate: true, autoRejectBelow: 20000 })
      expect(AgentService.shouldAutoReject(agent, 20000)).toBe(false)
    })

    it("should return false when bid is above autoRejectBelow threshold", () => {
      const agent = makeAgent({ autoNegotiate: true, autoRejectBelow: 20000 })
      expect(AgentService.shouldAutoReject(agent, 30000)).toBe(false)
    })

    it("should return false when no autoRejectBelow is set", () => {
      const agent = makeAgent({ autoNegotiate: true, autoRejectBelow: null })
      expect(AgentService.shouldAutoReject(agent, 5000)).toBe(false)
    })
  })

  // ── shouldAutoCounter ──────────────────────────────────────────────────────

  describe("shouldAutoCounter", () => {
    it("should return false when autoNegotiate is disabled", () => {
      const agent = makeAgent({
        autoNegotiate: false,
        autoCounterEnabled: true,
        autoRejectBelow: 10000,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 40000)).toBe(false)
    })

    it("should return false when autoCounterEnabled is false", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        autoCounterEnabled: false,
        autoRejectBelow: 10000,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 40000)).toBe(false)
    })

    it("should return true when bid is between reject threshold and accept threshold", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        autoCounterEnabled: true,
        autoRejectBelow: 10000,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 40000)).toBe(true)
    })

    it("should return false when bid is below autoRejectBelow threshold", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        autoCounterEnabled: true,
        autoRejectBelow: 10000,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 5000)).toBe(false)
    })

    it("should return false when bid meets or exceeds minAcceptAmount", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        autoCounterEnabled: true,
        autoRejectBelow: 10000,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 70000)).toBe(false)
    })

    it("should return false when no autoRejectBelow threshold set", () => {
      const agent = makeAgent({
        autoNegotiate: true,
        autoCounterEnabled: true,
        autoRejectBelow: null,
        minAcceptAmount: 70000,
      })
      expect(AgentService.shouldAutoCounter(agent, 40000)).toBe(false)
    })
  })
})
