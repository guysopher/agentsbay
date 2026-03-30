/**
 * AGE-101: Agent profiles and discovery
 *
 * Covers:
 * 1. GET /api/agents/public — list agents
 * 2. GET /api/agents/:id/profile — public profile
 * 3. 404 for unknown agent
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { GET as GetPublic } from "@/app/api/agents/public/route"
import { GET as GetProfile } from "@/app/api/agents/[id]/profile/route"

function createContext(id = "") {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(method: string, url = "http://localhost:3000") {
  return new NextRequest(url, { method })
}

const MOCK_AGENT = {
  id: "agent-001",
  name: "Shopping Bot",
  description: "I buy electronics",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: "user-001",
  isActive: true,
  deletedAt: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
})

describe("GET /api/agents/public", () => {
  it("returns paginated list of agents", async () => {
    jest.spyOn(db.agent, "findMany").mockResolvedValue([MOCK_AGENT] as never)
    jest.spyOn(db.agent, "count").mockResolvedValue(1 as never)
    jest.spyOn(db.order, "groupBy").mockResolvedValue([] as never)
    jest.spyOn(db.review, "groupBy").mockResolvedValue([] as never)

    const res = await GetPublic(makeRequest("GET", "http://localhost/api/agents/public?page=1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.total).toBe(1)
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0].id).toBe("agent-001")
    expect(body.data.items[0].name).toBe("Shopping Bot")
  })

  it("does not expose userId in response", async () => {
    jest.spyOn(db.agent, "findMany").mockResolvedValue([MOCK_AGENT] as never)
    jest.spyOn(db.agent, "count").mockResolvedValue(1 as never)
    jest.spyOn(db.order, "groupBy").mockResolvedValue([] as never)
    jest.spyOn(db.review, "groupBy").mockResolvedValue([] as never)

    const res = await GetPublic(makeRequest("GET", "http://localhost/api/agents/public"))
    const body = await res.json()
    expect(body.data.items[0]).not.toHaveProperty("userId")
  })

  it("defaults deals to 0 when no orders", async () => {
    jest.spyOn(db.agent, "findMany").mockResolvedValue([MOCK_AGENT] as never)
    jest.spyOn(db.agent, "count").mockResolvedValue(1 as never)
    jest.spyOn(db.order, "groupBy").mockResolvedValue([] as never)
    jest.spyOn(db.review, "groupBy").mockResolvedValue([] as never)

    const res = await GetPublic(makeRequest("GET", "http://localhost/api/agents/public"))
    const body = await res.json()
    expect(body.data.items[0].dealsCompleted).toBe(0)
    expect(body.data.items[0].avgRating).toBeNull()
  })
})

describe("GET /api/agents/:id/profile", () => {
  it("returns public profile with stats", async () => {
    jest.spyOn(db.agent, "findFirst").mockResolvedValue(MOCK_AGENT as never)
    jest.spyOn(db.order, "count").mockResolvedValue(3 as never)
    jest.spyOn(db.listing, "count").mockResolvedValue(5 as never)
    jest.spyOn(db.review, "findMany").mockResolvedValue([
      { rating: 4 },
      { rating: 5 },
    ] as never)

    const res = await GetProfile(makeRequest("GET"), createContext("agent-001"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe("agent-001")
    expect(body.data.name).toBe("Shopping Bot")
    expect(body.data.stats.dealsCompleted).toBe(3)
    expect(body.data.stats.activeListings).toBe(5)
    expect(body.data.stats.avgRating).toBe(4.5)
    expect(body.data.stats.reviewCount).toBe(2)
  })

  it("does not expose internal fields", async () => {
    jest.spyOn(db.agent, "findFirst").mockResolvedValue(MOCK_AGENT as never)
    jest.spyOn(db.order, "count").mockResolvedValue(0 as never)
    jest.spyOn(db.listing, "count").mockResolvedValue(0 as never)
    jest.spyOn(db.review, "findMany").mockResolvedValue([] as never)

    const res = await GetProfile(makeRequest("GET"), createContext("agent-001"))
    const body = await res.json()
    expect(body.data).not.toHaveProperty("userId")
  })

  it("returns 404 for unknown agent", async () => {
    jest.spyOn(db.agent, "findFirst").mockResolvedValue(null as never)

    const res = await GetProfile(makeRequest("GET"), createContext("nonexistent"))
    expect(res.status).toBe(404)
  })
})
