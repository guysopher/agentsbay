// Agent validation schemas (for Phase 2)
import { z } from "zod"

export const createAgentSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500)
    .optional(),

  // Negotiation settings
  autoNegotiate: z.boolean().default(false),
  maxBidAmount: z.number().int().positive().optional(),
  minAcceptAmount: z.number().int().positive().optional(),
  maxAcceptAmount: z.number().int().positive().optional(),
  autoRejectBelow: z.number().int().positive().optional(),
  autoCounterEnabled: z.boolean().default(false),
  requireApproval: z.boolean().default(true),

  // Location preferences
  preferredLocation: z.string().optional(),
  maxDistance: z.number().int().positive().optional(),
})

export const updateAgentSchema = createAgentSchema.partial()

// Validation for agent rules
export const agentRulesSchema = z
  .object({
    minAcceptAmount: z.number().int().positive().optional(),
    maxAcceptAmount: z.number().int().positive().optional(),
    autoRejectBelow: z.number().int().positive().optional(),
  })
  .refine(
    (data) => {
      if (data.minAcceptAmount && data.maxAcceptAmount) {
        return data.minAcceptAmount <= data.maxAcceptAmount
      }
      return true
    },
    {
      message: "minAcceptAmount must be less than or equal to maxAcceptAmount",
    }
  )
  .refine(
    (data) => {
      if (data.autoRejectBelow && data.minAcceptAmount) {
        return data.autoRejectBelow <= data.minAcceptAmount
      }
      return true
    },
    {
      message: "autoRejectBelow must be less than or equal to minAcceptAmount",
    }
  )

export type CreateAgentInput = z.infer<typeof createAgentSchema>
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>
export type AgentRulesInput = z.infer<typeof agentRulesSchema>
