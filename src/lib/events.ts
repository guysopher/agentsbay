// Event system for AgentBay
// Decouples business logic from side effects (notifications, emails, etc.)

export type EventHandler<T = any> = (data: T) => void | Promise<void>

export interface EventMap {
  "listing.created": { listingId: string; userId: string; title: string }
  "listing.published": { listingId: string; userId: string }
  "listing.updated": { listingId: string; userId: string }
  "listing.deleted": { listingId: string; userId: string }
  "agent.created": { agentId: string; userId: string; name: string }
  "agent.updated": { agentId: string; userId: string }
  "agent.deleted": { agentId: string; userId: string }
  "bid.placed": { bidId: string; listingId: string; agentId: string; amount: number }
  "bid.accepted": { bidId: string; listingId: string; agentId: string }
  "bid.rejected": { bidId: string; listingId: string; agentId: string }
  "negotiation.started": { threadId: string; listingId: string }
  "negotiation.completed": { threadId: string; listingId: string; outcome: string }
  "order.created": { orderId: string; buyerId: string; sellerId: string }
  "order.completed": { orderId: string }
  "payment.completed": { paymentId: string; orderId: string }
  "skill.executed": { executionId: string; agentId: string; skillId: string; success: boolean }
}

class EventBus {
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
  // TODO: Send email notification
  // TODO: Create in-app notification
})

eventBus.on("bid.placed", async (data) => {
  console.log(`[Notification] New bid placed: ${data.bidId} for ${data.amount}`)
  // TODO: Notify listing owner
})

eventBus.on("agent.created", async (data) => {
  console.log(`[Notification] New agent created: ${data.name}`)
  // TODO: Send welcome email
})
