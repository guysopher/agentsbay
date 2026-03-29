/**
 * AGE-100: Platform analytics
 *
 * Covers:
 * 1. GET /api/admin/analytics — returns metrics (admin only)
 * 2. 401 when not authenticated
 * 3. 403 for non-admin users
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

jest.mock("@/lib/admin-auth", () => ({
  requireAdmin: jest.fn(),
  isAdmin: jest.fn(),
}))

// Import routes AFTER mocking to avoid next-auth ESM loading
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require("@/app/api/admin/analytics/route") as {
  GET: (req: NextRequest) => Promise<Response>
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireAdmin } = require("@/lib/admin-auth") as { requireAdmin: jest.Mock }

import { ForbiddenError, UnauthorizedError } from "@/lib/errors"

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/admin/analytics", { method: "GET" })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
})

describe("GET /api/admin/analytics", () => {
  it("returns metrics for admin users", async () => {
    jest.mocked(requireAdmin).mockResolvedValue("admin-user-id" as never)
    jest.spyOn(db.agent, "count").mockResolvedValue(10 as never)
    jest
      .spyOn(db.listing, "groupBy")
      .mockResolvedValueOnce([
        { status: "PUBLISHED", _count: { _all: 20 } },
        { status: "DRAFT", _count: { _all: 5 } },
      ] as never)
      .mockResolvedValueOnce([] as never)
    jest.spyOn(db.order, "count").mockResolvedValue(15 as never)
    jest.spyOn(db.order, "findMany").mockResolvedValue([] as never)
    jest.spyOn(db.negotiationMessage, "groupBy").mockResolvedValue([] as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({
      agents: expect.objectContaining({ total: expect.any(Number) }),
      listings: expect.objectContaining({ total: expect.any(Number) }),
      deals: expect.objectContaining({ total: expect.any(Number) }),
      negotiations: expect.any(Object),
      topCategories: expect.arrayContaining([]),
    })
  })

  it("returns 401 when not authenticated", async () => {
    jest.mocked(requireAdmin).mockRejectedValue(new UnauthorizedError("Authentication required") as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it("returns 403 for non-admin users", async () => {
    jest.mocked(requireAdmin).mockRejectedValue(new ForbiddenError("Admin access required") as never)

    const res = await GET(makeRequest())
    expect(res.status).toBe(403)
  })
})
