import { buildTelegramNotificationText, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"
import { db } from "@/lib/db"
import { NotificationService } from "@/lib/notifications/service"
import { registerWebhookHandlers } from "@/lib/webhooks/handlers"
import { ReferralService } from "@/domain/referral/service"

// Event system for AgentBay
// Decouples business logic from side effects (notifications, emails, etc.)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventHandler<T = any> = (data: T) => void | Promise<void>

export interface EventMap {
  "listing.created": { listingId: string; userId: string; title: string }
  "listing.published": { listingId: string; userId: string }
  "listing.paused": { listingId: string; userId: string }
  "listing.relisted": { listingId: string; userId: string }
  "listing.updated": { listingId: string; userId: string }
  "listing.deleted": { listingId: string; userId: string }
  "agent.created": { agentId: string; userId: string; name: string }
  "agent.updated": { agentId: string; userId: string }
  "agent.deleted": { agentId: string; userId: string }
  "bid.placed": {
    bidId: string
    threadId: string
    listingId: string
    buyerId: string
    sellerId: string
    amount: number
  }
  "bid.countered": {
    originalBidId: string
    newBidId: string
    threadId: string
    amount: number
  }
  "bid.accepted": { bidId: string; threadId: string; orderId: string; amount: number }
  "bid.rejected": { bidId: string; threadId: string }
  "bid.expired": { bidId: string; threadId: string; listingId: string }
  "negotiation.started": { threadId: string; listingId: string }
  "negotiation.completed": { threadId: string; listingId: string; outcome: string }
  "order.created": { orderId: string; buyerId: string; sellerId: string }
  "order.updated": { orderId: string; buyerId: string; sellerId: string; status: string }
  "order.completed": { orderId: string }
  "payment.completed": { paymentId: string; orderId: string }
  "skill.executed": { executionId: string; agentId: string; skillId: string; success: boolean }
}

export class EventBus {
  private handlers: Map<keyof EventMap, Set<EventHandler>> = new Map()

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler)
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<K extends keyof EventMap>(event: K, data: EventMap[K]): Promise<void> {
    const handlers = this.handlers.get(event)
    if (!handlers || handlers.size === 0) {
      return
    }

    // Run all handlers in parallel
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(data)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
        // Don't let one handler failure break others
      }
    })

    await Promise.all(promises)
  }

  /**
   * Remove all handlers for an event
   */
  off<K extends keyof EventMap>(event: K): void {
    this.handlers.delete(event)
  }

  /**
   * Remove all handlers
   */
  clear(): void {
    this.handlers.clear()
  }
}

// Singleton instance
export const eventBus = new EventBus()

// Example event handlers (can be moved to separate files)

// Notification handler
eventBus.on("listing.created", async (data) => {
  console.log(`[Notification] New listing created: ${data.title}`)
  // TODO: Create notification in database
  // await db.notification.create({
  //   data: {
  //     userId: data.userId,
  //     type: "LISTING_CREATED",
  //     title: "Listing created",
  //     message: `Your listing "${data.title}" has been created`,
  //     metadata: { listingId: data.listingId },
  //   },
  // })
})

eventBus.on("listing.published", async (data) => {
  console.log(`[Notification] Listing published: ${data.listingId}`)

  // Referral reward: check if this is the publisher's first listing
  void ReferralService.handleFirstListingPublished(data.userId)

  if (!isTelegramConfigured()) {
    return
  }

  await sendTelegramMessage({
    text: buildTelegramNotificationText("listing.published", {
      listingId: data.listingId,
      userId: data.userId,
    }),
  })

  // TODO: Create in-app notification
})

eventBus.on("bid.placed", async (data) => {
  console.log(`[Notification] New bid placed: ${data.bidId} for ${data.amount}`)
  try {
    const listing = await db.listing.findUnique({
      where: { id: data.listingId },
      select: { title: true },
    })
    const amount = (data.amount / 100).toFixed(2)
    await NotificationService.create({
      userId: data.sellerId,
      type: "BID_RECEIVED",
      title: "New bid received",
      message: `Someone bid $${amount} on "${listing?.title ?? "your listing"}"`,
      link: `/negotiations/${data.listingId}`,
    })
  } catch (error) {
    console.error("[Notification] Failed to create bid.placed notification:", error)
  }
})

eventBus.on("bid.accepted", async (data) => {
  console.log(`[Notification] Bid accepted: ${data.bidId}`)
  try {
    const thread = await db.negotiationThread.findUnique({
      where: { id: data.threadId },
      include: { Listing: { select: { title: true } } },
    })
    if (!thread) return
    const amount = (data.amount / 100).toFixed(2)
    await NotificationService.create({
      userId: thread.buyerId,
      type: "BID_ACCEPTED",
      title: "Your bid was accepted!",
      message: `Your $${amount} bid on "${thread.Listing.title}" was accepted`,
      link: `/orders/${data.orderId}`,
    })
  } catch (error) {
    console.error("[Notification] Failed to create bid.accepted notification:", error)
  }
})

eventBus.on("bid.rejected", async (data) => {
  console.log(`[Notification] Bid rejected: ${data.bidId}`)
  try {
    const thread = await db.negotiationThread.findUnique({
      where: { id: data.threadId },
      include: { Listing: { select: { title: true } } },
    })
    if (!thread) return
    await NotificationService.create({
      userId: thread.buyerId,
      type: "BID_REJECTED",
      title: "Your bid was declined",
      message: `Your bid on "${thread.Listing.title}" was declined`,
      link: `/negotiations/${thread.id}`,
    })
  } catch (error) {
    console.error("[Notification] Failed to create bid.rejected notification:", error)
  }
})

eventBus.on("bid.countered", async (data) => {
  console.log(`[Notification] Bid countered: ${data.originalBidId}`)
  try {
    const thread = await db.negotiationThread.findUnique({
      where: { id: data.threadId },
      include: { Listing: { select: { title: true } } },
    })
    if (!thread) return
    const amount = (data.amount / 100).toFixed(2)
    // Notify buyer that seller countered
    await NotificationService.create({
      userId: thread.buyerId,
      type: "BID_COUNTERED",
      title: "Counter-offer received",
      message: `Seller countered at $${amount} on "${thread.Listing.title}"`,
      link: `/negotiations/${thread.id}`,
    })
  } catch (error) {
    console.error("[Notification] Failed to create bid.countered notification:", error)
  }
})

eventBus.on("agent.created", async (data) => {
  console.log(`[Notification] New agent created: ${data.name}`)
  // TODO: Send welcome email
})

// Register webhook dispatch handlers
registerWebhookHandlers(eventBus)
