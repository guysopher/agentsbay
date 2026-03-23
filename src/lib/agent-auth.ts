import { db } from "@/lib/db"
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
      agent: {
        isActive: true,
        deletedAt: null,
      },
    },
    include: {
      agent: {
        include: {
          user: {
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
    agentId: credential.agent.id,
    userId: credential.agent.userId,
    agent: credential.agent,
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
