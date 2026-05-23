import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { POST as registerPOST } from "@/app/api/agent/register/route"
import { GET as activationSourcesGET } from "@/app/api/agent/metrics/activation-sources/route"
import { getAgentEmailDomain } from "@/lib/site-config"

describe("agent registration attribution routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
  })

  it("attributes registrations from the query ref when the body omits source", async () => {
    jest.spyOn(db.user, "findUnique").mockResolvedValue(null as never)
    jest.spyOn(db.user, "create").mockResolvedValue({
      id: "user-created",
    } as never)

    const auditLogCreate = jest.fn().mockResolvedValue({ id: "audit-1" })
    const agentCreate = jest.fn().mockResolvedValue({
      id: "agent-docs-1",
      name: "Docs Agent",
      description: "Installed from the hosted API docs",
      createdAt: new Date("2026-03-27T08:00:00.000Z"),
    })
    const agentCredentialCreate = jest.fn().mockResolvedValue({ id: "cred-1" })

    jest.spyOn(db, "$transaction").mockImplementation(async (callback: never) => {
      const tx = {
        agent: { create: agentCreate },
        agentCredential: { create: agentCredentialCreate },
        auditLog: { create: auditLogCreate },
      }

      return (callback as (args: typeof tx) => Promise<unknown>)(tx) as never
    })

    const response = await registerPOST(
      new NextRequest("http://localhost/api/agent/register?ref=api_docs_20260327", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Docs Agent",
          description: "Installed from the hosted API docs",
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.attributionSource).toBe("api_docs_20260327")
    expect(body.data.agent.name).toBe("Docs Agent")
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      select: { id: true },
    })
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true },
      })
    )
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "agent.registered",
          metadata: expect.objectContaining({
            source: "api_docs_20260327",
          }),
        }),
      })
    )
  })

  it("avoids full user selects so registration survives drifted user columns", async () => {
    jest.spyOn(db.user, "findUnique").mockResolvedValue(null as never)
    jest.spyOn(db.user, "create").mockResolvedValue({
      id: "user-drift-safe",
    } as never)

    const auditLogCreate = jest.fn().mockResolvedValue({ id: "audit-2" })
    const agentCreate = jest.fn().mockResolvedValue({
      id: "agent-drift-safe",
      name: "Drift Safe Agent",
      description: "Production drift regression test",
      createdAt: new Date("2026-05-23T17:20:00.000Z"),
    })
    const agentCredentialCreate = jest.fn().mockResolvedValue({ id: "cred-2" })

    jest.spyOn(db, "$transaction").mockImplementation(async (callback: never) => {
      const tx = {
        agent: { create: agentCreate },
        agentCredential: { create: agentCredentialCreate },
        auditLog: { create: auditLogCreate },
      }

      return (callback as (args: typeof tx) => Promise<unknown>)(tx) as never
    })

    const response = await registerPOST(
      new NextRequest("http://localhost/api/agent/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "user-drift-safe",
          name: "Drift Safe Agent",
          description: "Production drift regression test",
        }),
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.userId).toBe("user-drift-safe")
    expect(db.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-drift-safe" },
      select: { id: true },
    })
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: "user-drift-safe",
          email: `user-drift-safe@${getAgentEmailDomain()}`,
        }),
        select: { id: true },
      })
    )
  })

  it("returns activation-source metrics that expose the hosted docs campaign", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-ops-1",
        userId: "user-ops-1",
        User: {
          id: "user-ops-1",
          name: "Ops Agent",
          email: "ops@example.com",
        },
      },
    } as never)

    jest.spyOn(db, "$queryRaw").mockResolvedValue([
      {
        source: "api_docs_20260327",
        registrations: 2,
        lastRegisteredAt: new Date("2026-03-27T09:30:00.000Z"),
      },
      {
        source: "github_readme_20260523",
        registrations: 1,
        lastRegisteredAt: new Date("2026-03-27T09:00:00.000Z"),
      },
    ] as never)

    const response = await activationSourcesGET(
      new NextRequest("http://localhost/api/agent/metrics/activation-sources?days=30", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_valid",
        },
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.totals.activatedAgents).toBe(3)
    expect(body.data.totals.trackedSources).toBe(2)
    expect(body.data.sources[0]).toEqual(
      expect.objectContaining({
        source: "api_docs_20260327",
        activatedAgents: 2,
        share: 0.6667,
        lastRegisteredAt: "2026-03-27T09:30:00.000Z",
      })
    )
  })
})
