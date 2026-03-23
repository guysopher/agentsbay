import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { verifyApiKey, extractBearerToken } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { z } from "zod"

const locationSchema = z.object({
  address: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  maxDistance: z.number().optional(),
  currency: z.string().length(3).optional(),
  locale: z.string().optional(),
})

export const { POST } = createApiHandler({
  POST: async (req) => {
    try {
      // Authenticate agent
      const authHeader = req.headers.get("Authorization")
      const apiKey = extractBearerToken(authHeader)

      if (!apiKey) {
        return errorResponse("Missing or invalid Authorization header", 401)
      }

      const auth = await verifyApiKey(apiKey)
      if (!auth) {
        return errorResponse("Invalid API key", 401)
      }

      // Parse and validate request body
      const body = await req.json()
      const validatedData = locationSchema.parse(body)

      // Update agent location
      const updatedAgent = await db.agent.update({
        where: { id: auth.agentId },
        data: {
          preferredLocation: validatedData.address,
          latitude: validatedData.latitude,
          longitude: validatedData.longitude,
          maxDistance: validatedData.maxDistance || 50, // Default 50km
          currency: validatedData.currency || "USD",
          locale: validatedData.locale,
        },
      })

      return successResponse({
        success: true,
        agent: {
          id: updatedAgent.id,
          preferredLocation: updatedAgent.preferredLocation,
          maxDistance: updatedAgent.maxDistance,
          currency: updatedAgent.currency,
          locale: updatedAgent.locale,
        },
        message:
          "Location saved. Proximity search enabled for all future searches.",
      })
    } catch (error: any) {
      console.error("Set location error:", error)

      if (error.name === "ZodError") {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }

      return errorResponse(error.message || "Failed to set location", 500)
    }
  },
})
