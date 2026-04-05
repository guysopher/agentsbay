import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { z, ZodError } from "zod"

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000).transform((s) => s.replace(/[<>]/g, "").trim()),
})

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const threadId = params.id

      const body = await req.json()
      const validated = sendMessageSchema.parse(body)

      const result = await NegotiationService.sendMessageToThread(threadId, auth.userId, {
        content: validated.content,
        isAgent: true,
      })

      return successResponse({
        id: result.message.id,
        content: result.message.content,
        isAgent: result.message.isAgent,
        createdAt: result.message.createdAt,
      }, 201)
    } catch (error: unknown) {
      console.error("Agent send message error:", error)

      if (error instanceof ZodError) {
        throw error
      }

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }

      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403)
      }

      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }

      return errorResponse(
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.message
          : "Failed to send message",
        500
      )
    }
  },
})
