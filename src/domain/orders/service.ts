import { db } from "@/lib/db"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { DeliveryStatus, FulfillmentMethod, ListingStatus, OrderStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import { eventBus } from "@/lib/events"
import { notifyOrderInTransit, notifyOrderCompleted } from "@/lib/email-notifications"

interface SchedulePickupInput {
  pickupLocation: string
}

interface ListByUserFilters {
  status?: OrderStatus[]
  cursor?: string
  limit?: number
}

interface ListByUserResult {
  items: Array<{
    id: string
    status: OrderStatus
    listingId: string
    listingTitle: string
    amount: number
    fulfillmentMethod: FulfillmentMethod
    pickupLocation: string | null
    deliveryAddress: string | null
    buyerId: string
    sellerId: string
    createdAt: Date
    updatedAt: Date
  }>
  nextCursor: string | null
  hasMore: boolean
}

export class OrderService {
  static async listByUser(userId: string, filters: ListByUserFilters = {}): Promise<ListByUserResult> {
    const limit = filters.limit ?? 20

    const orders = await db.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        ...(filters.status && filters.status.length > 0 && { status: { in: filters.status } }),
      },
      include: {
        Listing: {
          select: { id: true, title: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(filters.cursor && {
        cursor: { id: filters.cursor },
        skip: 1,
      }),
    })

    const hasMore = orders.length > limit
    const results = hasMore ? orders.slice(0, limit) : orders
    const nextCursor = hasMore ? results[results.length - 1].id : null

    return {
      items: results.map((o) => ({
        id: o.id,
        status: o.status,
        listingId: o.listingId,
        listingTitle: o.Listing.title,
        amount: o.amount,
        fulfillmentMethod: o.fulfillmentMethod,
        pickupLocation: o.pickupLocation,
        deliveryAddress: o.deliveryAddress,
        buyerId: o.buyerId,
        sellerId: o.sellerId,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      nextCursor,
      hasMore,
    }
  }

  static async getById(orderId: string, actorUserId: string) {
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: actorUserId }, { sellerId: actorUserId }],
      },
      include: {
        DeliveryRequest: true,
        Listing: {
          select: {
            id: true,
            title: true,
            status: true,
            price: true,
            currency: true,
          },
        },
      },
    })

    if (!order) {
      throw new NotFoundError("Order")
    }

    return order
  }

  static async schedulePickup(orderId: string, actorUserId: string, input: SchedulePickupInput) {
    const now = new Date()
    // Read + validate + write inside transaction to prevent TOCTOU race conditions
    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          sellerId: actorUserId,
        },
        include: {
          Listing: true,
        },
      })

      if (!order) {
        throw new NotFoundError("Order")
      }

      if (order.fulfillmentMethod !== FulfillmentMethod.PICKUP) {
        throw new ValidationError("Order is not configured for pickup")
      }

      if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.IN_TRANSIT) {
        throw new ValidationError("Pickup can only be scheduled for paid or in-transit orders")
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          pickupLocation: input.pickupLocation.trim(),
          status: OrderStatus.IN_TRANSIT,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: actorUserId,
          action: "order.pickup_scheduled",
          entityType: "order",
          entityId: orderId,
          metadata: {
            pickupLocation: input.pickupLocation.trim(),
          },
        },
      })

      return updatedOrder
    })

    // Emit order.updated for webhook dispatch (fire-and-forget)
    void eventBus.emit("order.updated", {
      orderId: updated.id,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
      status: updated.status,
    })

    // Fire-and-forget email to buyer
    void (async () => {
      try {
        const buyer = await db.user.findUnique({ where: { id: updated.buyerId }, select: { email: true, name: true } })
        const listing = await db.listing.findUnique({ where: { id: updated.listingId }, select: { title: true } })
        if (buyer && listing) {
          await notifyOrderInTransit({
            buyerEmail: buyer.email,
            buyerName: buyer.name,
            listingTitle: listing.title,
            orderId: updated.id,
          })
        }
      } catch {
        // swallow
      }
    })()

    return updated
  }

  static async markAsPaid(orderId: string, actorUserId: string) {
    const now = new Date()
    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          buyerId: actorUserId,
        },
      })

      if (!order) {
        throw new NotFoundError("Order")
      }

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ValidationError("Order is not awaiting payment")
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: actorUserId,
          action: "order.marked_paid",
          entityType: "order",
          entityId: orderId,
          metadata: {},
        },
      })

      return updatedOrder
    })

    void eventBus.emit("order.updated", {
      orderId: updated.id,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
      status: updated.status,
    })

    return updated
  }

  static async closeout(orderId: string, actorUserId: string) {
    const now = new Date()
    // Read + validate + write inside transaction to prevent TOCTOU race conditions
    const updated = await db.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          sellerId: actorUserId,
        },
        include: {
          DeliveryRequest: true,
          Listing: true,
        },
      })

      if (!order) {
        throw new NotFoundError("Order")
      }

      if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.IN_TRANSIT) {
        throw new ValidationError("Order cannot be closed out from current status")
      }

      if (
        order.fulfillmentMethod === FulfillmentMethod.DELIVERY &&
        order.DeliveryRequest &&
        order.DeliveryRequest.status !== DeliveryStatus.DELIVERED
      ) {
        throw new ValidationError("Delivery order must be delivered before closeout")
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.COMPLETED,
          completedAt: now,
          updatedAt: now,
        },
      })

      await tx.listing.update({
        where: { id: order.listingId },
        data: {
          status: ListingStatus.SOLD,
          soldAt: now,
          updatedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: actorUserId,
          action: "order.closed_out",
          entityType: "order",
          entityId: orderId,
          metadata: {
            listingId: order.listingId,
          },
        },
      })

      return updatedOrder
    })

    // Emit order.updated for webhook dispatch (fire-and-forget)
    void eventBus.emit("order.updated", {
      orderId: updated.id,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
      status: updated.status,
    })

    // Fire-and-forget emails to buyer and seller
    void (async () => {
      try {
        const [buyer, seller, listing] = await Promise.all([
          db.user.findUnique({ where: { id: updated.buyerId }, select: { email: true, name: true } }),
          db.user.findUnique({ where: { id: updated.sellerId }, select: { email: true, name: true } }),
          db.listing.findUnique({ where: { id: updated.listingId }, select: { title: true } }),
        ])
        if (buyer && seller && listing) {
          await notifyOrderCompleted({
            buyerEmail: buyer.email,
            buyerName: buyer.name,
            sellerEmail: seller.email,
            sellerName: seller.name,
            listingTitle: listing.title,
            orderId: updated.id,
          })
        }
      } catch {
        // swallow
      }
    })()

    return updated
  }
}
