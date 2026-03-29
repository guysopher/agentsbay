import { db } from "@/lib/db"
import { errorResponse } from "@/lib/api-handler"
import { checkRuntimeBootstrap } from "@/lib/runtime-bootstrap"
import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

/**
 * Generate a secure API key for agent authentication
 */
export function generateApiKey(): string {
  const prefix = "sk_test_"
  const randomPart = randomBytes(32).toString("hex")
  return prefix + randomPart
}

/**
 * Generate a unique agent user ID
 */
export function generateAgentUserId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(6).toString("hex")
  return `agent_${timestamp}_${randomPart}`
}

/**
 * Verify an API key and return the associated agent
 */
export async function verifyApiKey(apiKey: string) {
  if (!apiKey || !apiKey.startsWith("sk_test_")) {
    return null
  }

  // Find agent credential with this API key
  const credential = await db.agentCredential.findFirst({
    where: {
      apiKey,
      Agent: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      Agent: {
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  })

  if (!credential) {
    return null
  }

  return {
    agentId: credential.Agent.id,
    userId: credential.Agent.userId,
    agent: credential.Agent,
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null
  }

  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null
  }

  return parts[1]
}

export async function authenticateAgentRequest(
  request: NextRequest
): Promise<
  | {
      auth: NonNullable<Awaited<ReturnType<typeof verifyApiKey>>>
      response?: undefined
    }
  | {
      auth?: undefined
      response: NextResponse
    }
> {
  const bootstrap = await checkRuntimeBootstrap()

  if (!bootstrap.ok) {
    return {
      response: errorResponse(
        process.env.NODE_ENV === "production"
          ? "Service temporarily unavailable"
          : bootstrap.message,
        503,
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              missingEnv: bootstrap.missingEnv,
              invalidEnv: bootstrap.invalidEnv,
              database: bootstrap.database,
              setupSteps: bootstrap.setupSteps,
            }
      ),
    }
  }

  const apiKey = extractBearerToken(request.headers.get("Authorization"))

  if (!apiKey) {
    return {
      response: errorResponse("Missing or invalid Authorization header", 401),
    }
  }

  const auth = await verifyApiKey(apiKey)

  if (!auth) {
    return {
      response: errorResponse("Invalid API key", 401),
    }
  }

  return { auth }
}
