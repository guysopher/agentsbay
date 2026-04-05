import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReviewService } from "@/domain/reviews/service"
import { db } from "@/lib/db"
import { z, ZodError } from "zod"

const configUpdateSchema = z.object({
  config: z.object({
    autoNegotiate: z.boolean().optional(),
    autoCounterEnabled: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    maxBidAmount: z.number().int().positive().nullable().optional(),
    minAcceptAmount: z.number().int().positive().nullable().optional(),
    maxAcceptAmount: z.number().int().positive().nullable().optional(),
    autoRejectBelow: z.number().int().positive().nullable().optional(),
    preferredLocation: z.string().nullable().optional(),
    maxDistance: z.number().int().positive().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
  }).optional(),
})

export const { GET, PATCH } = createApiHandler({
  PATCH: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const body = await req.json()
      const validatedData = configUpdateSchema.parse(body)

      const configData = validatedData.config ?? {}

      const updatedAgent = await db.agent.update({
        where: { id: auth.agentId },
        data: configData,
      })

      return successResponse({
        agentId: updatedAgent.id,
        config: {
          autoNegotiate: updatedAgent.autoNegotiate,
          autoCounterEnabled: updatedAgent.autoCounterEnabled,
          requireApproval: updatedAgent.requireApproval,
          maxBidAmount: updatedAgent.maxBidAmount,
          minAcceptAmount: updatedAgent.minAcceptAmount,
          maxAcceptAmount: updatedAgent.maxAcceptAmount,
          autoRejectBelow: updatedAgent.autoRejectBelow,
          preferredLocation: updatedAgent.preferredLocation,
          maxDistance: updatedAgent.maxDistance,
          latitude: updatedAgent.latitude,
          longitude: updatedAgent.longitude,
        },
      })
    } catch (error: unknown) {
      console.error("Agent profile update error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, {
          errors: error.errors,
        })
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to update profile",
        500
      )
    }
  },
  GET: async (req) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const [averageRating] = await Promise.all([
        ReviewService.getAverageRating(auth.userId),
      ])

      return successResponse({
        agentId: auth.agent.id,
        name: auth.agent.name,
        description: auth.agent.description,
        isActive: auth.agent.isActive,
        createdAt: auth.agent.createdAt,
        user: {
          id: auth.userId,
          name: auth.agent.User.name,
        },
        config: {
          autoNegotiate: auth.agent.autoNegotiate,
          autoCounterEnabled: auth.agent.autoCounterEnabled,
          requireApproval: auth.agent.requireApproval,
          maxBidAmount: auth.agent.maxBidAmount,
          minAcceptAmount: auth.agent.minAcceptAmount,
          maxAcceptAmount: auth.agent.maxAcceptAmount,
          autoRejectBelow: auth.agent.autoRejectBelow,
          preferredLocation: auth.agent.preferredLocation,
          maxDistance: auth.agent.maxDistance,
          currency: auth.agent.currency,
          locale: auth.agent.locale,
          latitude: auth.agent.latitude,
          longitude: auth.agent.longitude,
        },
        reputation: {
          averageRating: averageRating.average,
          totalReviews: averageRating.count,
        },
      })
    } catch (error: unknown) {
      console.error("Agent profile error:", error)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch profile",
        500
      )
    }
  },
})
