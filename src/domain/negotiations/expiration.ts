import { db } from "@/lib/db"
import { BidStatus } from "@prisma/client"
import { eventBus } from "@/lib/events"
import { logError } from "@/lib/errors"

export interface ExpiredBidsSummary {
  processed: number
  expired: number
}

/**
 * Find all PENDING bids past their expiresAt timestamp and mark them EXPIRED.
 * Emits a `bid.expired` event for each expired bid.
 */
export async function checkExpiredBids(): Promise<ExpiredBidsSummary> {
  try {
    const now = new Date()

    // Wrap findMany + updateMany in a transaction to avoid race conditions
    // where a bid is accepted/rejected between the two calls.
    const result = await db.$transaction(async (tx) => {
      const expiredBids = await tx.bid.findMany({
        where: {
          status: BidStatus.PENDING,
          expiresAt: { lte: now },
        },
        select: {
          id: true,
          threadId: true,
          NegotiationThread: {
            select: { listingId: true },
          },
        },
      })

      if (expiredBids.length === 0) {
        return { processed: 0, expired: 0, bids: [] as typeof expiredBids }
      }

      const ids = expiredBids.map((b) => b.id)

      const { count } = await tx.bid.updateMany({
        where: { id: { in: ids }, status: BidStatus.PENDING },
        data: { status: BidStatus.EXPIRED, updatedAt: now },
      })

      return { processed: expiredBids.length, expired: count, bids: expiredBids }
    })

    // Emit events after transaction commits
    await Promise.all(
      result.bids.map((bid) =>
        eventBus.emit("bid.expired", {
          bidId: bid.id,
          threadId: bid.threadId,
          listingId: bid.NegotiationThread.listingId,
        })
      )
    )

    return { processed: result.processed, expired: result.expired }
  } catch (error) {
    logError(error, { context: "checkExpiredBids" })
    throw error
  }
}
