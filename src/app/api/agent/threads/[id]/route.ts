import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const threadId = params.id

      const thread = await NegotiationService.getThread(threadId, auth.userId)

      return successResponse({
        id: thread.id,
        listingId: thread.listingId,
        listing: {
          id: thread.Listing.id,
          title: thread.Listing.title,
          description: thread.Listing.description,
          price: thread.Listing.price,
          currency: thread.Listing.currency,
          category: thread.Listing.category,
          condition: thread.Listing.condition,
          status: thread.Listing.status,
          images: thread.Listing.ListingImage.map(img => ({
            url: img.url,
            order: img.order
          }))
        },
        buyerId: thread.buyerId,
        sellerId: thread.sellerId,
        status: thread.status,
        bids: thread.Bid.map(bid => ({
          id: bid.id,
          amount: bid.amount,
          message: bid.message,
          status: bid.status,
          expiresAt: bid.expiresAt,
          createdAt: bid.createdAt,
          updatedAt: bid.updatedAt
        })),
        messages: thread.NegotiationMessage.map(msg => ({
          id: msg.id,
          content: msg.content,
          isAgent: msg.isAgent,
          createdAt: msg.createdAt
        })),
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        closedAt: thread.closedAt
      })
    } catch (error: unknown) {
      console.error("Agent get thread error:", error)

      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }

      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to get thread",
        500
      )
    }
  },
})
