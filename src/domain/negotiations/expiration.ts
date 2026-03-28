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

    // Find all PENDING bids that have passed their expiry
    const expiredBids = await db.bid.findMany({
      where: {
        status: BidStatus.PENDING,
        expiresAt: { lt: now },
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
      return { processed: 0, expired: 0 }
    }

    const ids = expiredBids.map((b) => b.id)

    // Batch update all expired bids
    const { count } = await db.bid.updateMany({
      where: { id: { in: ids } },
      data: { status: BidStatus.EXPIRED, updatedAt: now },
    })

    // Emit events for each expired bid
    await Promise.all(
      expiredBids.map((bid) =>
        eventBus.emit("bid.expired", {
          bidId: bid.id,
          threadId: bid.threadId,
          listingId: bid.NegotiationThread.listingId,
        })
      )
    )

    return { processed: expiredBids.length, expired: count }
  } catch (error) {
    logError(error, { context: "checkExpiredBids" })
    throw error
  }
}
