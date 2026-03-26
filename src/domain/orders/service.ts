import { db } from "@/lib/db"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { DeliveryStatus, FulfillmentMethod, ListingStatus, OrderStatus } from "@prisma/client"
import { randomUUID } from "crypto"

interface SchedulePickupInput {
  pickupLocation: string
}

export class OrderService {
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
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: actorUserId }, { sellerId: actorUserId }],
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

    const now = new Date()
    const updated = await db.$transaction(async (tx) => {
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

    return updated
  }

  static async closeout(orderId: string, actorUserId: string) {
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        OR: [{ buyerId: actorUserId }, { sellerId: actorUserId }],
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

    const now = new Date()
    const updated = await db.$transaction(async (tx) => {
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

    return updated
  }
}
