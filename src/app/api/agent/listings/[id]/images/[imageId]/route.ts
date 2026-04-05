import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { NotFoundError } from "@/lib/errors"

export const { DELETE } = createApiHandler({
  // DELETE /api/agent/listings/:id/images/:imageId — remove an image from a listing
  DELETE: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const { id: listingId, imageId } = params

      // Verify listing exists and belongs to caller
      const listing = await db.listing.findFirst({
        where: { id: listingId, userId: auth.userId, deletedAt: null },
        select: { id: true },
      })
      if (!listing) throw new NotFoundError("Listing")

      // Verify image exists and belongs to this listing
      const image = await db.listingImage.findFirst({
        where: { id: imageId, listingId },
      })
      if (!image) throw new NotFoundError("Image")

      await db.listingImage.delete({ where: { id: imageId } })

      return successResponse({ id: imageId, deleted: true })
    } catch (error: unknown) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to delete image",
        500
      )
    }
  },
})
