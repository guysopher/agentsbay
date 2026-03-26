import { beforeEach, describe, expect, it } from "@jest/globals"
import {
  DeliveryStatus,
  FulfillmentMethod,
  ItemCondition,
  ListingCategory,
  ListingStatus,
  OrderStatus,
  ThreadStatus,
} from "@prisma/client"
import { randomUUID } from "crypto"
import { OrderService } from "@/domain/orders/service"
import { cleanDatabase, createTestUser, testDb } from "../../setup"

describe("OrderService", () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  async function createOrderFixture(fulfillmentMethod: FulfillmentMethod = FulfillmentMethod.PICKUP) {
    const buyer = await createTestUser({ email: `buyer-${Date.now()}@example.com` })
    const seller = await createTestUser({ email: `seller-${Date.now()}@example.com` })
    const now = new Date()

    const listing = await testDb.listing.create({
      data: {
        id: randomUUID(),
        userId: seller.id,
        title: "Test Listing",
        description: "Order fixture listing",
        category: ListingCategory.OTHER,
        condition: ItemCondition.GOOD,
        price: 15000,
        address: "Test City",
        status: ListingStatus.PUBLISHED,
        pickupAvailable: true,
        deliveryAvailable: fulfillmentMethod === FulfillmentMethod.DELIVERY,
        publishedAt: now,
        updatedAt: now,
      },
    })

    const thread = await testDb.negotiationThread.create({
      data: {
        id: randomUUID(),
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        status: ThreadStatus.ACCEPTED,
        updatedAt: now,
      },
    })

    const order = await testDb.order.create({
      data: {
        id: randomUUID(),
        threadId: thread.id,
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        amount: 15000,
        status: OrderStatus.PAID,
        fulfillmentMethod,
        updatedAt: now,
      },
    })

    return { buyer, seller, listing, thread, order }
  }

  it("schedules pickup for paid pickup order", async () => {
    const { order, buyer } = await createOrderFixture(FulfillmentMethod.PICKUP)

    const updated = await OrderService.schedulePickup(order.id, buyer.id, {
      pickupLocation: "123 Main St",
    })

    expect(updated.status).toBe(OrderStatus.IN_TRANSIT)
    expect(updated.pickupLocation).toBe("123 Main St")
  })

  it("closes out order and marks listing sold", async () => {
    const { order, buyer, listing } = await createOrderFixture(FulfillmentMethod.PICKUP)

    const closed = await OrderService.closeout(order.id, buyer.id)

    expect(closed.status).toBe(OrderStatus.COMPLETED)
    expect(closed.completedAt).toBeDefined()

    const updatedListing = await testDb.listing.findUnique({ where: { id: listing.id } })
    expect(updatedListing?.status).toBe(ListingStatus.SOLD)
    expect(updatedListing?.soldAt).toBeDefined()
  })

  it("rejects closeout for undelivered delivery order", async () => {
    const { order, buyer } = await createOrderFixture(FulfillmentMethod.DELIVERY)

    await testDb.deliveryRequest.create({
      data: {
        id: randomUUID(),
        orderId: order.id,
        status: DeliveryStatus.IN_TRANSIT,
        fromAddress: "Warehouse",
        toAddress: "Buyer Address",
        updatedAt: new Date(),
      },
    })

    await expect(OrderService.closeout(order.id, buyer.id)).rejects.toThrow(
      "Delivery order must be delivered before closeout"
    )
  })
})
