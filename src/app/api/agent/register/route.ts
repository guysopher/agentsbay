import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { db } from "@/lib/db"
import { generateApiKey } from "@/lib/agent-auth"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  userId: z.string().min(1),
})

export const { POST } = createApiHandler({
  POST: async (req) => {
    try {
      const body = await req.json()
      const validatedData = registerSchema.parse(body)

      // Check if user exists
      const user = await db.user.findUnique({
        where: { id: validatedData.userId },
      })

      if (!user) {
        // Auto-create user for agent registration (allows agents to self-register)
        await db.user.create({
          data: {
            id: validatedData.userId,
            email: `${validatedData.userId}@agent.agentbay.com`,
            name: validatedData.name,
          },
        })
      }

      // Generate API key
      const apiKey = generateApiKey()
      const verificationToken = generateApiKey() // Use same format for verification

      // Create agent and credential in transaction
      const result = await db.$transaction(async (tx) => {
        const agent = await tx.agent.create({
          data: {
            userId: validatedData.userId,
            name: validatedData.name,
            description: validatedData.description,
            isActive: true,
          },
        })

        // Store API key in credentials
        await tx.agentCredential.create({
          data: {
            agentId: agent.id,
            provider: "agentbay",
            apiKey,
          },
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            userId: validatedData.userId,
            agentId: agent.id,
            action: "agent.registered",
            entityType: "agent",
            entityId: agent.id,
            metadata: { name: agent.name },
          },
        })

        return { agent, apiKey, verificationToken }
      })

      return successResponse({
        agentId: result.agent.id,
        apiKey: result.apiKey,
        verificationToken: result.verificationToken,
        status: "active", // Auto-activate for now
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
