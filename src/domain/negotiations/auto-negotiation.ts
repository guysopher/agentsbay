import { db } from "@/lib/db"
import { eventBus } from "@/lib/events"
import { NegotiationService } from "./service"
import { BidStatus } from "@prisma/client"
import {
  evaluateRules,
  DEFAULT_SELLER_RULES,
  DEFAULT_BUYER_RULES,
  type RuleContext,
} from "./rules"

/**
 * Count how many bids in a thread were placed by an agent (auto-rounds).
 * Used to prevent infinite negotiation loops.
 */
async function countAutoRounds(threadId: string): Promise<number> {
  return db.bid.count({
    where: {
      threadId,
      agentId: { not: null },
      status: { not: BidStatus.PENDING }, // only settled bids count toward rounds
    },
  })
}

/**
 * Load the active agent settings for a given user.
 * Returns null if the user has no active agent with auto-negotiation enabled.
 */
async function getAutoNegotiateAgent(userId: string) {
  return db.agent.findFirst({
    where: {
      userId,
      isActive: true,
      autoNegotiate: true,
      deletedAt: null,
    },
    select: {
      id: true,
      autoNegotiate: true,
      minAcceptAmount: true,
      maxAcceptAmount: true,
      autoRejectBelow: true,
      autoCounterEnabled: true,
      maxBidAmount: true,
      requireApproval: true,
    },
  })
}

/**
 * Build rule context from DB models for rule evaluation.
 */
function buildRuleContext(
  bidAmount: number,
  askPrice: number,
  agent: NonNullable<Awaited<ReturnType<typeof getAutoNegotiateAgent>>>,
  autoRoundCount: number
): RuleContext {
  return {
    bid: { amount: bidAmount },
    listing: { askPrice },
    agent: {
      minAcceptAmount: agent.minAcceptAmount,
      maxAcceptAmount: agent.maxAcceptAmount,
      autoRejectBelow: agent.autoRejectBelow,
      autoCounterEnabled: agent.autoCounterEnabled,
      maxBidAmount: agent.maxBidAmount,
    },
    thread: { autoRoundCount },
  }
}

/**
 * Register auto-negotiation event handlers on the global event bus.
 * Call this once at application startup.
 */
export function registerAutoNegotiationHandlers(): void {
  // ─── bid.placed → seller auto-responds ──────────────────────────────────────
  eventBus.on("bid.placed", async ({ bidId, threadId, listingId, sellerId, amount }) => {
    try {
      const sellerAgent = await getAutoNegotiateAgent(sellerId)
      if (!sellerAgent || sellerAgent.requireApproval) return

      const autoRounds = await countAutoRounds(threadId)

      // Load listing asking price for counter-offer calculation
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { price: true, userId: true },
      })
      if (!listing) return

      const ctx = buildRuleContext(amount, listing.price, sellerAgent, autoRounds)
      const decision = evaluateRules(DEFAULT_SELLER_RULES, ctx)

      switch (decision.action) {
        case "ACCEPT":
          console.log(`[AutoNegotiate] seller auto-accepting bid ${bidId} (${amount} >= minAccept ${sellerAgent.minAcceptAmount})`)
          await NegotiationService.acceptBid(bidId, sellerId)
          break
        case "REJECT":
          console.log(`[AutoNegotiate] seller auto-rejecting bid ${bidId} (${amount} < autoReject ${sellerAgent.autoRejectBelow})`)
          await NegotiationService.rejectBid(bidId, sellerId)
          break
        case "COUNTER": {
          console.log(`[AutoNegotiate] seller auto-countering bid ${bidId} with ${decision.amount}`)
          await NegotiationService.counterBid(bidId, sellerId, {
            amount: decision.amount,
            message: `Auto-counter offer: $${(decision.amount / 100).toFixed(2)}`,
            agentId: sellerAgent.id,
          })
          break
        }
        case "SKIP":
          break
      }
    } catch (error) {
      console.error("[AutoNegotiate] Error in bid.placed handler:", error)
    }
  })

  // ─── bid.countered → buyer auto-responds ────────────────────────────────────
  eventBus.on("bid.countered", async ({ newBidId, threadId, amount }) => {
    try {
      // Load thread to find buyer
      const thread = await db.negotiationThread.findUnique({
        where: { id: threadId },
        include: {
          Listing: { select: { price: true } },
          Bid: {
            where: { id: newBidId },
            select: { agentId: true },
          },
        },
      })
      if (!thread) return

      // Only respond if the counter was placed by a seller agent (agentId set on new bid)
      const counterBid = thread.Bid[0]
      if (!counterBid?.agentId) return // human counter — don't auto-respond

      const buyerAgent = await getAutoNegotiateAgent(thread.buyerId)
      if (!buyerAgent || buyerAgent.requireApproval) return

      const autoRounds = await countAutoRounds(threadId)
      const ctx = buildRuleContext(amount, thread.Listing.price, buyerAgent, autoRounds)
      const decision = evaluateRules(DEFAULT_BUYER_RULES, ctx)

      switch (decision.action) {
        case "ACCEPT":
          console.log(`[AutoNegotiate] buyer auto-accepting counter ${newBidId} (${amount})`)
          await NegotiationService.acceptBid(newBidId, thread.buyerId)
          break
        case "REJECT":
          console.log(`[AutoNegotiate] buyer auto-rejecting counter ${newBidId} (${amount} > maxBid ${buyerAgent.maxBidAmount})`)
          await NegotiationService.rejectBid(newBidId, thread.buyerId)
          break
        case "COUNTER": {
          console.log(`[AutoNegotiate] buyer auto-countering counter ${newBidId} with ${decision.amount}`)
          await NegotiationService.counterBid(newBidId, thread.buyerId, {
            amount: decision.amount,
            message: `Auto-counter: my max is $${(decision.amount / 100).toFixed(2)}`,
            agentId: buyerAgent.id,
          })
          break
        }
        case "SKIP":
          break
      }
    } catch (error) {
      console.error("[AutoNegotiate] Error in bid.countered handler:", error)
    }
  })
}
