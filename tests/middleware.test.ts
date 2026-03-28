/**
 * Unit tests for src/middleware.ts (AGE-35)
 *
 * Tests the centralized auth middleware's allowlist logic, bearer token
 * presence checks, session guards, and security header injection.
 *
 * Strategy: mock `@/lib/auth` so the `auth()` wrapper calls our handler
 * synchronously with a controllable `req.auth` value.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals"
import { NextRequest, NextResponse } from "next/server"

// ── Mock NextAuth ────────────────────────────────────────────────────────────
// `auth(handler)` should just call handler(req) after attaching req.auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn((handler: (req: NextRequest & { auth?: unknown }) => unknown) => handler),
}))

// Import middleware AFTER mocking so it picks up the mock
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: middleware } = require("../src/middleware") as {
  default: (req: NextRequest & { auth?: unknown }) => NextResponse
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(
  path: string,
  opts: {
    method?: string
    auth?: unknown
    authHeader?: string
  } = {}
): NextRequest & { auth?: unknown } {
  const req = new NextRequest(`http://localhost${path}`, {
    method: opts.method ?? "GET",
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
  }) as NextRequest & { auth?: unknown }
  req.auth = opts.auth ?? null
  return req
}

function securityHeadersPresent(res: NextResponse): boolean {
  return (
    res.headers.get("X-Frame-Options") === "DENY" &&
    res.headers.get("X-Content-Type-Options") === "nosniff" &&
    res.headers.get("Referrer-Policy") === "strict-origin-when-cross-origin" &&
    res.headers.get("Permissions-Policy") === "camera=(), microphone=(), geolocation=()"
  )
}

const MOCK_SESSION = { user: { id: "user-1", email: "a@b.com" } }

// ── Public API routes ────────────────────────────────────────────────────────
describe("public API routes — no auth required", () => {
  const PUBLIC_ROUTES = [
    "/api/auth/signin",
    "/api/auth/callback/credentials",
    "/api/auth/csrf",
    "/api/health",
    "/api/skills",
    "/api/skills/agentbay-api",
    "/api/agent/register",
  ]

  it.each(PUBLIC_ROUTES)("passes through %s without credentials", (path) => {
    const res = middleware(makeReq(path))
    expect(res.status).not.toBe(401)
    expect(securityHeadersPresent(res)).toBe(true)
  })

  it("passes GET /api/listings without credentials", () => {
    const res = middleware(makeReq("/api/listings", { method: "GET" }))
    expect(res.status).not.toBe(401)
  })

  it("passes GET /api/wanted without credentials", () => {
    const res = middleware(makeReq("/api/wanted", { method: "GET" }))
    expect(res.status).not.toBe(401)
  })
})

// ── Agent Bearer token routes ────────────────────────────────────────────────
describe("agent API routes — Bearer token presence check", () => {
  const AGENT_ROUTES = [
    "/api/agent/listings",
    "/api/agent/listings/abc123",
    "/api/agent/listings/search",
    "/api/agent/orders/order-1",
    "/api/agent/threads",
    "/api/agent/threads/thread-1",
  ]

  it.each(AGENT_ROUTES)("blocks %s when Authorization header is missing", (path) => {
    const res = middleware(makeReq(path))
    expect(res.status).toBe(401)
  })

  it.each(AGENT_ROUTES)("blocks %s when Authorization is not Bearer", (path) => {
    const res = middleware(makeReq(path, { authHeader: "Basic abc123" }))
    expect(res.status).toBe(401)
  })

  it.each(AGENT_ROUTES)("passes %s when Authorization: Bearer sk_test_* is present", (path) => {
    const res = middleware(makeReq(path, { authHeader: "Bearer sk_test_abc123" }))
    expect(res.status).not.toBe(401)
    expect(securityHeadersPresent(res)).toBe(true)
  })
})

// ── Cron routes ───────────────────────────────────────────────────────────────
describe("cron routes — Bearer token presence check", () => {
  it("blocks /api/cron/expire-bids when Authorization is missing", () => {
    const res = middleware(makeReq("/api/cron/expire-bids", { method: "POST" }))
    expect(res.status).toBe(401)
  })

  it("passes /api/cron/expire-bids when Bearer token is present", () => {
    const res = middleware(
      makeReq("/api/cron/expire-bids", {
        method: "POST",
        authHeader: "Bearer my-cron-secret",
      })
    )
    expect(res.status).not.toBe(401)
  })
})

// ── Session-protected API routes ─────────────────────────────────────────────
describe("session-protected API routes", () => {
  const SESSION_ROUTES = [
    { path: "/api/listings", method: "POST" },
    { path: "/api/wanted", method: "POST" },
    { path: "/api/negotiations/thread-1/bids", method: "POST" },
    { path: "/api/notifications", method: "GET" },
    { path: "/api/notifications/unread-count", method: "GET" },
    { path: "/api/agents", method: "GET" },
    { path: "/api/agents/agent-1", method: "PATCH" },
    { path: "/api/commands/execute", method: "POST" },
  ]

  it.each(SESSION_ROUTES)(
    "blocks $method $path when session is absent",
    ({ path, method }) => {
      const res = middleware(makeReq(path, { method, auth: null }))
      expect(res.status).toBe(401)
    }
  )

  it.each(SESSION_ROUTES)(
    "passes $method $path when session is present",
    ({ path, method }) => {
      const res = middleware(makeReq(path, { method, auth: MOCK_SESSION }))
      expect(res.status).not.toBe(401)
      expect(securityHeadersPresent(res)).toBe(true)
    }
  )
})

// ── Page routes ───────────────────────────────────────────────────────────────
describe("protected page routes", () => {
  const PROTECTED_PAGES = [
    "/profile",
    "/dashboard",
    "/orders",
    "/listings/new",
  ]

  it.each(PROTECTED_PAGES)("redirects %s to /auth/signin when unauthenticated", (path) => {
    const res = middleware(makeReq(path, { auth: null }))
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/auth/signin")
    expect(res.headers.get("location")).toContain(
      `callbackUrl=${encodeURIComponent(path)}`
    )
  })

  it.each(PROTECTED_PAGES)("passes %s when session is present", (path) => {
    const res = middleware(makeReq(path, { auth: MOCK_SESSION }))
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(401)
    expect(securityHeadersPresent(res)).toBe(true)
  })
})

// ── Public pages ──────────────────────────────────────────────────────────────
describe("public page routes", () => {
  const PUBLIC_PAGES = ["/", "/listings", "/listings/abc123", "/auth/signin"]

  it.each(PUBLIC_PAGES)("passes %s without a session", (path) => {
    const res = middleware(makeReq(path, { auth: null }))
    expect(res.status).not.toBe(307)
    expect(res.status).not.toBe(401)
    expect(securityHeadersPresent(res)).toBe(true)
  })
})

// ── Security headers ──────────────────────────────────────────────────────────
describe("security headers", () => {
  it("injects all four security headers on every non-blocked response", () => {
    const paths = [
      "/api/health",
      "/api/listings",
      "/",
      "/listings/abc",
    ]
    for (const path of paths) {
      const res = middleware(makeReq(path))
      expect(securityHeadersPresent(res)).toBe(true)
    }
  })
})
