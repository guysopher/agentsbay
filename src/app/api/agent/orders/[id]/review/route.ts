import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { ReviewService } from "@/domain/reviews/service"
import { createReviewSchema } from "@/domain/reviews/validation"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

export const { POST } = createApiHandler({
  POST: async (req, context) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }
    const { auth } = authResult

    const params = await context.params
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const parsed = createReviewSchema.safeParse(body)
    if (!parsed.success) {
      const details = parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }))
      return errorResponse("Validation failed", 400, { errors: details })
    }

    try {
      const review = await ReviewService.createReview(params.id, auth.userId, parsed.data)
      return successResponse(review, 201)
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return errorResponse("Order not found", 404)
      }
      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403)
      }
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400)
      }
      if (error instanceof ZodError) {
        return errorResponse("Validation failed", 400)
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return errorResponse("You have already reviewed this order", 400)
      }
      console.error("Agent create review error:", error)
      return errorResponse("Failed to create review", 500)
    }
  },
})
