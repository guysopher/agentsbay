import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import {
  ReferralService,
  InvalidReferralCodeError,
  SelfReferralError,
  AlreadyReferredError,
} from "@/domain/referral/service"
import { z } from "zod"

const applySchema = z.object({
  code: z.string().min(1),
})

export const { POST } = createApiHandler({
  POST: async (req) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }
    const { auth } = authResult

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const parsed = applySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("code is required", 400)
    }

    try {
      const result = await ReferralService.applyCode(auth.userId, parsed.data.code)
      return successResponse(result, 200)
    } catch (err) {
      if (err instanceof SelfReferralError) {
        return errorResponse(err.message, 400)
      }
      if (err instanceof InvalidReferralCodeError) {
        return errorResponse(err.message, 400)
      }
      if (err instanceof AlreadyReferredError) {
        return errorResponse(err.message, 400)
      }
      throw err
    }
  },
})
