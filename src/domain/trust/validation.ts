import { z } from "zod"
import { ModerationReason, ModerationStatus, ModerationTargetType, ModeratorActionType } from "@prisma/client"

export const createCaseSchema = z.object({
  targetType: z.nativeEnum(ModerationTargetType),
  reason: z.nativeEnum(ModerationReason),
  description: z.string().max(1000).optional(),
})

export const resolveCaseSchema = z.object({
  action: z.nativeEnum(ModeratorActionType),
  reason: z.string().max(1000).optional(),
})

export const listCasesSchema = z.object({
  status: z.nativeEnum(ModerationStatus).optional(),
  targetType: z.nativeEnum(ModerationTargetType).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type ResolveCaseInput = z.infer<typeof resolveCaseSchema>
export type ListCasesInput = z.infer<typeof listCasesSchema>
