import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { NegotiationService } from "@/domain/negotiations/service"

export interface TimelineEntry {
  type: "bid" | "counter" | "accept" | "reject" | "expire" | "message"
  timestamp: string
  actor: "buyer" | "seller" | "system"
  data: {
    amount?: number
    status?: string
    content?: string
    isAgent?: boolean
    bidId?: string
  }
}

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

      // Build timeline by merging bids and messages chronologically
      const timeline: TimelineEntry[] = []

      for (const bid of thread.Bid) {
        const isBuyer = bid.agentId
          ? thread.buyerId === auth.userId // rough heuristic; agentId exists
          : true // first bid is always from buyer

        // Determine the timeline event type from bid status
        let type: TimelineEntry["type"] = "bid"
        if (bid.status === "COUNTERED") {
          type = "counter"
        } else if (bid.status === "ACCEPTED") {
          type = "accept"
        } else if (bid.status === "REJECTED") {
          type = "reject"
        } else if (bid.status === "EXPIRED") {
          type = "expire"
        }

        // Determine actor based on who placed the bid
        // If placedByUserId exists, use it; otherwise infer from position
        const bidPlacedByUserId = (bid as Record<string, unknown>).placedByUserId as string | null
        let actor: TimelineEntry["actor"] = "system"
        if (bidPlacedByUserId) {
          actor = bidPlacedByUserId === thread.buyerId ? "buyer" : "seller"
        } else {
          // Fallback: first bid in a thread is from buyer, counters alternate
          actor = bid.amount <= thread.Listing.price ? "buyer" : "seller"
        }

        timeline.push({
          type,
          timestamp: bid.createdAt.toISOString(),
          actor,
          data: {
            amount: bid.amount,
            status: bid.status,
            isAgent: !!bid.agentId,
            bidId: bid.id,
          },
        })
      }

      for (const msg of thread.NegotiationMessage) {
        timeline.push({
          type: "message",
          timestamp: msg.createdAt.toISOString(),
          actor: "system", // Messages don't track buyer/seller directly
          data: {
            content: msg.content,
            isAgent: msg.isAgent,
          },
        })
      }

      // Sort chronologically ascending
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      return successResponse({
        timeline,
        thread: {
          id: thread.id,
          status: thread.status,
          buyerId: thread.buyerId,
          sellerId: thread.sellerId,
          listingId: thread.listingId,
          createdAt: thread.createdAt,
          closedAt: thread.closedAt,
        },
      })
    } catch (error: unknown) {
      console.error("Agent timeline error:", error)

      if (error instanceof Error && error.message.includes("not found")) {
        return errorResponse("Thread not found", 404)
      }

      if (error instanceof Error && error.message.includes("Not authorized")) {
        return errorResponse(error.message, 403)
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to get timeline",
        500
      )
    }
  },
})
