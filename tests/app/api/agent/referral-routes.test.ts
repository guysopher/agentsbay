import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { ReferralService } from "@/domain/referral/service"
import { GET } from "@/app/api/referrals/route"
import { POST } from "@/app/api/referrals/apply/route"

const mockAgent = {
  id: "agent-1",
  userId: "user-1",
}

function makeRequest(method: string, body?: unknown, headers?: Record<string, string>) {
  const url = method === "GET" ? "http://localhost/api/referrals" : "http://localhost/api/referrals/apply"
  return new NextRequest(url, {
    method,
    headers: { Authorization: "Bearer sk_test_abc", ...(headers ?? {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("GET /api/referrals", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: mockAgent,
    } as never)
  })

  it("returns referral stats for authenticated user", async () => {
    const stats = {
      referralCode: "ABC12345",
      referralCount: 3,
      pendingRewards: 2,
      claimedRewards: 1,
    }
    jest.spyOn(ReferralService, "getStats").mockResolvedValue(stats)

    const response = await GET(makeRequest("GET"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.referralCode).toBe("ABC12345")
    expect(body.data.referralCount).toBe(3)
    expect(body.data.pendingRewards).toBe(2)
    expect(body.data.claimedRewards).toBe(1)
  })

  it("calls getStats with the authenticated user id", async () => {
    const statsSpy = jest.spyOn(ReferralService, "getStats").mockResolvedValue({
      referralCode: "TEST1234",
      referralCount: 0,
      pendingRewards: 0,
      claimedRewards: 0,
    })

    await GET(makeRequest("GET"))

    expect(statsSpy).toHaveBeenCalledWith("user-1")
  })

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/referrals", { method: "GET" })
    )
    expect(response.status).toBe(401)
  })
})

describe("POST /api/referrals/apply", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: mockAgent,
    } as never)
  })

  it("applies a valid referral code and returns referrerId", async () => {
    jest.spyOn(ReferralService, "applyCode").mockResolvedValue({ referrerId: "referrer-99" })

    const response = await POST(makeRequest("POST", { code: "ABC12345" }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.referrerId).toBe("referrer-99")
  })

  it("calls applyCode with correct userId and code", async () => {
    const applySpy = jest.spyOn(ReferralService, "applyCode").mockResolvedValue({ referrerId: "ref-1" })

    await POST(makeRequest("POST", { code: "MYCODE01" }))

    expect(applySpy).toHaveBeenCalledWith("user-1", "MYCODE01")
  })

  it("returns 400 for invalid/unknown code", async () => {
    jest.spyOn(ReferralService, "applyCode").mockRejectedValue(
      new (await import("@/domain/referral/service")).InvalidReferralCodeError("Invalid or unknown referral code")
    )

    const response = await POST(makeRequest("POST", { code: "INVALID1" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toBe("Invalid or unknown referral code")
  })

  it("returns 400 for self-referral", async () => {
    jest.spyOn(ReferralService, "applyCode").mockRejectedValue(
      new (await import("@/domain/referral/service")).SelfReferralError("You cannot use your own referral code")
    )

    const response = await POST(makeRequest("POST", { code: "OWN12345" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toBe("You cannot use your own referral code")
  })

  it("returns 400 when user already has a referral applied", async () => {
    jest.spyOn(ReferralService, "applyCode").mockRejectedValue(
      new (await import("@/domain/referral/service")).AlreadyReferredError("A referral code has already been applied to your account")
    )

    const response = await POST(makeRequest("POST", { code: "ALREADY1" }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toBe("A referral code has already been applied to your account")
  })

  it("returns 400 when code field is missing", async () => {
    const response = await POST(makeRequest("POST", {}))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.message).toBe("code is required")
  })

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/referrals/apply", {
        method: "POST",
        body: JSON.stringify({ code: "ABC12345" }),
      })
    )
    expect(response.status).toBe(401)
  })
})
