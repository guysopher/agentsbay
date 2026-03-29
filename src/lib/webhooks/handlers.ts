// Wire EventBus events to webhook dispatcher
// Each handler resolves the target agentId and calls dispatchWebhookEvent

import { db } from "@/lib/db"
import { eventBus } from "@/lib/events"
import { dispatchWebhookEvent } from "./dispatcher"

export function registerWebhookHandlers(): void {
  // bid.placed → notify listing owner agent: "bid.received"
  eventBus.on("bid.placed", async (data) => {
    try {
      const listing = await db.listing.findUnique({
        where: { id: data.listingId },
        select: { agentId: true },
      })
      if (listing?.agentId) {
        await dispatchWebhookEvent("bid.received", listing.agentId, {
          bidId: data.bidId,
          threadId: data.threadId,
          listingId: data.listingId,
          amount: data.amount,
        })
      }
    } catch (err) {
      console.error("[Webhook] bid.placed handler error:", err)
    }
  })

  // negotiation.started → notify both buyer and seller agents: "negotiation.message"
  eventBus.on("negotiation.started", async (data) => {
    try {
      const thread = await db.negotiationThread.findUnique({
        where: { id: data.threadId },
        include: {
          User_NegotiationThread_buyerIdToUser: { select: { Agent: { select: { id: true } } } },
          User_NegotiationThread_sellerIdToUser: { select: { Agent: { select: { id: true } } } },
        },
      })
      if (!thread) return
      const payload = { threadId: data.threadId, listingId: data.listingId }
      const buyerAgents = thread.User_NegotiationThread_buyerIdToUser.Agent
      const sellerAgents = thread.User_NegotiationThread_sellerIdToUser.Agent
      for (const agent of [...buyerAgents, ...sellerAgents]) {
        await dispatchWebhookEvent("negotiation.message", agent.id, payload)
      }
    } catch (err) {
      console.error("[Webhook] negotiation.started handler error:", err)
    }
  })

  // bid.accepted → notify buyer agent: "negotiation.accepted"
  eventBus.on("bid.accepted", async (data) => {
    try {
      const thread = await db.negotiationThread.findUnique({
        where: { id: data.threadId },
        include: {
          User_NegotiationThread_buyerIdToUser: { select: { Agent: { select: { id: true } } } },
        },
      })
      if (!thread) return
      const payload = { bidId: data.bidId, threadId: data.threadId, orderId: data.orderId, amount: data.amount }
      for (const agent of thread.User_NegotiationThread_buyerIdToUser.Agent) {
        await dispatchWebhookEvent("negotiation.accepted", agent.id, payload)
      }
    } catch (err) {
      console.error("[Webhook] bid.accepted handler error:", err)
    }
  })

  // bid.rejected → notify buyer agent: "negotiation.rejected"
  eventBus.on("bid.rejected", async (data) => {
    try {
      const thread = await db.negotiationThread.findUnique({
        where: { id: data.threadId },
        include: {
          User_NegotiationThread_buyerIdToUser: { select: { Agent: { select: { id: true } } } },
        },
      })
      if (!thread) return
      const payload = { bidId: data.bidId, threadId: data.threadId }
      for (const agent of thread.User_NegotiationThread_buyerIdToUser.Agent) {
        await dispatchWebhookEvent("negotiation.rejected", agent.id, payload)
      }
    } catch (err) {
      console.error("[Webhook] bid.rejected handler error:", err)
    }
  })

  // order.updated → notify buyer and seller agents: "order.status_changed"
  eventBus.on("order.updated", async (data) => {
    try {
      const order = await db.order.findUnique({
        where: { id: data.orderId },
        include: {
          User: { select: { Agent: { select: { id: true } } } },
        },
      })
      if (!order) return

      // Get seller's agents too
      const sellerAgents = await db.agent.findMany({
        where: { userId: order.sellerId, isActive: true, deletedAt: null },
        select: { id: true },
      })

      const payload = { orderId: data.orderId, status: data.status }
      const allAgents = [...order.User.Agent, ...sellerAgents]
      const seen = new Set<string>()
      for (const agent of allAgents) {
        if (seen.has(agent.id)) continue
        seen.add(agent.id)
        await dispatchWebhookEvent("order.status_changed", agent.id, payload)
      }
    } catch (err) {
      console.error("[Webhook] order.updated handler error:", err)
    }
  })
}
