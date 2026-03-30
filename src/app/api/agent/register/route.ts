import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { generateApiKey, generateAgentUserId } from "@/lib/agent-auth"
import { z } from "zod"
import { randomUUID } from "crypto"

const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  userId: z.string().min(1).max(50).optional(),
  source: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
})

function sanitizeSource(value?: string | null): string | undefined {
  if (!value) return undefined
  const parsed = z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export const { POST } = createApiHandler({
  POST: async (req) => {
    try {
      const body = await req.json()
      const validatedData = registerSchema.parse(body)
      const querySource = sanitizeSource(req.nextUrl.searchParams.get("source") || req.nextUrl.searchParams.get("ref"))
      const headerSource = sanitizeSource(req.headers.get("x-agentbay-ref"))
      const source = validatedData.source || querySource || headerSource || undefined

      // Auto-generate userId if not provided
      const userId: string = validatedData.userId || generateAgentUserId()

      // Check if user exists
      const user = await db.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        // Auto-create user for agent registration (allows agents to self-register)
        const now = new Date()
        await db.user.create({
          data: {
            id: userId,
            email: `${userId}@${process.env.AGENT_EMAIL_DOMAIN || 'agent.agentbay.com'}`,
            name: validatedData.name || "Agent User",
            updatedAt: now,
          },
        })
      }

      // Generate API key
      const apiKey = generateApiKey()

      // Create agent and credential in transaction
      const result = await db.$transaction(async (tx) => {
        const now = new Date()
        const agent = await tx.agent.create({
          data: {
            id: randomUUID(),
            userId,
            name: validatedData.name || "Agent",
            description: validatedData.description,
            isActive: true,
            updatedAt: now,
          },
        })

        // Store API key in credentials
        await tx.agentCredential.create({
          data: {
            id: randomUUID(),
            agentId: agent.id,
            provider: "agentbay",
            apiKey,
            updatedAt: now,
          },
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            userId,
            agentId: agent.id,
            action: "agent.registered",
            entityType: "agent",
            entityId: agent.id,
            metadata: {
              name: agent.name,
              source: source || null,
            },
          },
        })

        return { agent, apiKey }
      })

      return successResponse({
        userId,
        agentId: result.agent.id,
        apiKey: result.apiKey,
        status: "active",
        attributionSource: source || null,
        agent: {
          id: result.agent.id,
          name: result.agent.name,
          description: result.agent.description,
          createdAt: result.agent.createdAt,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }
      console.error("Agent registration error:", error)
      return errorResponse("Failed to register agent", 500)
    }
  },
})
