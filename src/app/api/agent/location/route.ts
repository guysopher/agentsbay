import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { z, ZodError } from "zod"
import { geocodeAddress } from "@/lib/geocoding"

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
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      // Parse and validate request body
      const body = await req.json()
      const validatedData = locationSchema.parse(body)

      // Geocode address if coordinates not provided
      let latitude = validatedData.latitude
      let longitude = validatedData.longitude

      if (!latitude || !longitude) {
        const geocoded = await geocodeAddress(validatedData.address)
        if (geocoded) {
          latitude = geocoded.latitude
          longitude = geocoded.longitude
        }
      }

      // Update agent location
      const updatedAgent = await db.agent.update({
        where: { id: auth.agentId },
        data: {
          preferredLocation: validatedData.address,
          latitude,
          longitude,
          maxDistance: validatedData.maxDistance || 50, // Default 50km
          currency: validatedData.currency,
          locale: validatedData.locale,
        },
      })

      return successResponse({
        success: true,
        agent: {
          id: updatedAgent.id,
          preferredLocation: updatedAgent.preferredLocation,
          latitude: updatedAgent.latitude,
          longitude: updatedAgent.longitude,
          maxDistance: updatedAgent.maxDistance,
          currency: updatedAgent.currency,
          locale: updatedAgent.locale,
        },
        message: updatedAgent.latitude && updatedAgent.longitude
          ? "Location saved. Proximity search is now enabled."
          : "Location saved. Add coordinates to enable distance-based search.",
      })
    } catch (error: unknown) {
      console.error("Set location error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to set location",
        500
      )
    }
  },
})
