/**
 * AGE-99: Webhook notifications for agent events
 *
 * Covers:
 * 1. POST /api/agent/webhooks — register a webhook
 * 2. GET /api/agent/webhooks — list registered webhooks
 * 3. DELETE /api/agent/webhooks/:id — remove a webhook
 * 4. Auth enforcement on all routes
 * 5. Validation: HTTPS required, valid event types, max 5 webhooks
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { GET, POST } from "@/app/api/agent/webhooks/route"
import { DELETE } from "@/app/api/agent/webhooks/[id]/route"

function createContext(id = "") {
  return { params: Promise.resolve({ id }) }
}

const MOCK_AGENT = {
  id: "agent-123",
  userId: "user-456",
  isActive: true,
  deletedAt: null,
  name: "Test Agent",
  latitude: null,
  longitude: null,
  autoNegotiate: false,
  requireApproval: true,
}

const MOCK_CREDENTIAL = {
  agentId: "agent-123",
  apiKey: "sk_test_abc",
  Agent: {
    ...MOCK_AGENT,
    User: { id: "user-456", name: "Test User", email: "test@example.com" },
  },
}

const MOCK_WEBHOOK = {
  id: "webhook-001",
  agentId: "agent-123",
  url: "https://example.com/hook",
  events: ["bid.received", "order.status_changed"],
  secret: "abc123secret",
  isActive: true,
  createdAt: new Date("2026-03-29T00:00:00.000Z"),
  updatedAt: new Date("2026-03-29T00:00:00.000Z"),
}

function makeRequest(method: string, body?: unknown, path = "/api/agent/webhooks") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer sk_test_abc",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe("Webhook API routes (AGE-99)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_CREDENTIAL as never)
  })

  // ─── GET /api/agent/webhooks ───────────────────────────────────────────────

  describe("GET /api/agent/webhooks", () => {
    it("returns empty list when no webhooks registered", async () => {
      jest.spyOn(db.webhook, "findMany").mockResolvedValue([] as never)

      const res = await GET(makeRequest("GET"), createContext())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toEqual([])
    })

    it("returns registered webhooks without secret", async () => {
      jest.spyOn(db.webhook, "findMany").mockResolvedValue([
        {
          id: MOCK_WEBHOOK.id,
          url: MOCK_WEBHOOK.url,
          events: MOCK_WEBHOOK.events,
          isActive: true,
          createdAt: MOCK_WEBHOOK.createdAt,
        },
      ] as never)

      const res = await GET(makeRequest("GET"), createContext())
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data).toHaveLength(1)
      expect(body.data[0]).not.toHaveProperty("secret")
      expect(body.data[0].url).toBe("https://example.com/hook")
    })

    it("returns 401 without Authorization header", async () => {
      const req = new NextRequest("http://localhost/api/agent/webhooks", { method: "GET" })
      const res = await GET(req, createContext())
      expect(res.status).toBe(401)
    })
  })

  // ─── POST /api/agent/webhooks ──────────────────────────────────────────────

  describe("POST /api/agent/webhooks", () => {
    it("registers a webhook and returns secret on creation", async () => {
      jest.spyOn(db.webhook, "count").mockResolvedValue(0 as never)
      jest.spyOn(db.webhook, "create").mockResolvedValue({
        id: MOCK_WEBHOOK.id,
        url: MOCK_WEBHOOK.url,
        events: MOCK_WEBHOOK.events,
        isActive: true,
        createdAt: MOCK_WEBHOOK.createdAt,
      } as never)

      const res = await POST(
        makeRequest("POST", { url: "https://example.com/hook", events: ["bid.received"] }),
        createContext()
      )

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.data.id).toBe(MOCK_WEBHOOK.id)
      // Secret is generated server-side and included at creation
      expect(body.data).toHaveProperty("secret")
    })

    it("rejects non-HTTPS URL for external hosts", async () => {
      const res = await POST(
        makeRequest("POST", { url: "http://external.com/hook", events: ["bid.received"] }),
        createContext()
      )
      expect(res.status).toBe(400)
    })

    it("allows HTTP for localhost", async () => {
      jest.spyOn(db.webhook, "count").mockResolvedValue(0 as never)
      jest.spyOn(db.webhook, "create").mockResolvedValue({
        id: MOCK_WEBHOOK.id,
        url: "http://localhost:3001/hook",
        events: ["bid.received"],
        isActive: true,
        createdAt: MOCK_WEBHOOK.createdAt,
      } as never)

      const res = await POST(
        makeRequest("POST", { url: "http://localhost:3001/hook", events: ["bid.received"] }),
        createContext()
      )
      expect(res.status).toBe(201)
    })

    it("rejects invalid event types", async () => {
      const res = await POST(
        makeRequest("POST", { url: "https://example.com/hook", events: ["invalid.event"] }),
        createContext()
      )
      expect(res.status).toBe(400)
    })

    it("enforces max 5 webhooks per agent", async () => {
      jest.spyOn(db.webhook, "count").mockResolvedValue(5 as never)

      const res = await POST(
        makeRequest("POST", { url: "https://example.com/hook", events: ["bid.received"] }),
        createContext()
      )
      expect(res.status).toBe(400)
    })

    it("returns 400 when events array is missing", async () => {
      const res = await POST(
        makeRequest("POST", { url: "https://example.com/hook" }),
        createContext()
      )
      expect(res.status).toBe(400)
    })

    it("returns 401 without Authorization header", async () => {
      const req = new NextRequest("http://localhost/api/agent/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/hook", events: ["bid.received"] }),
      })
      const res = await POST(req, createContext())
      expect(res.status).toBe(401)
    })
  })

  // ─── DELETE /api/agent/webhooks/:id ───────────────────────────────────────

  describe("DELETE /api/agent/webhooks/:id", () => {
    it("deletes a webhook owned by the agent and returns 204", async () => {
      jest.spyOn(db.webhook, "findFirst").mockResolvedValue(MOCK_WEBHOOK as never)
      jest.spyOn(db.webhook, "delete").mockResolvedValue(MOCK_WEBHOOK as never)

      const res = await DELETE(
        makeRequest("DELETE", undefined, "/api/agent/webhooks/webhook-001"),
        createContext("webhook-001")
      )
      expect(res.status).toBe(204)
    })

    it("returns 404 for webhook not owned by the agent", async () => {
      jest.spyOn(db.webhook, "findFirst").mockResolvedValue(null as never)

      const res = await DELETE(
        makeRequest("DELETE", undefined, "/api/agent/webhooks/webhook-999"),
        createContext("webhook-999")
      )
      expect(res.status).toBe(404)
    })

    it("returns 401 without Authorization header", async () => {
      const req = new NextRequest("http://localhost/api/agent/webhooks/webhook-001", {
        method: "DELETE",
      })
      const res = await DELETE(req, createContext("webhook-001"))
      expect(res.status).toBe(401)
    })
  })
})
