/**
 * OrderService — unit tests with mocked Prisma
 *
 * Covers:
 * 1. schedulePickup transitions order to IN_TRANSIT (AC4)
 * 2. closeout completes the order and marks listing SOLD (AC4)
 * 3. closeout rejects buyer (not seller) with NotFoundError
 * 4. closeout rejects undelivered delivery order
 * 5. schedulePickup: rejects when concurrent status change inside transaction
 * 6. closeout: rejects when concurrent status change inside transaction
 * 7. completeOrder transitions IN_TRANSIT order to COMPLETED (buyer)
 * 8. completeOrder rejects seller (not buyer) with NotFoundError
 * 9. completeOrder rejects order not in IN_TRANSIT status
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import {
  DeliveryStatus,
  FulfillmentMethod,
  ListingStatus,
  OrderStatus,
} from "@prisma/client"
import { OrderService } from "@/domain/orders/service"
import { db } from "@/lib/db"
import { NotFoundError } from "@/lib/errors"

jest.mock("@/lib/db", () => ({
  db: { $transaction: jest.fn() },
}))

jest.mock("@/lib/events", () => ({
  eventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock("@/lib/errors", () => {
  class NotFoundError extends Error {
    constructor(msg: string) { super(msg + " not found") }
  }
  class ValidationError extends Error {}
  return { NotFoundError, ValidationError, logError: jest.fn() }
})

const ORDER_ID = "order-1"
const BUYER_ID = "buyer-1"
const SELLER_ID = "seller-1"
const LISTING_ID = "listing-1"

function makeOrder(overrides: Partial<{
  id: string
  buyerId: string
  sellerId: string
  status: OrderStatus
  fulfillmentMethod: FulfillmentMethod
  listingId: string
  DeliveryRequest: object | null
  Listing: object
}> = {}) {
  return {
    id: ORDER_ID,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    listingId: LISTING_ID,
    amount: 15000,
    status: OrderStatus.PAID,
    fulfillmentMethod: FulfillmentMethod.PICKUP,
    DeliveryRequest: null,
    Listing: { id: LISTING_ID, title: "Test" },
    ...overrides,
  }
}

describe("OrderService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("schedules pickup for paid pickup order (seller only)", async () => {
    const order = makeOrder()
    const updatedOrder = { ...order, status: OrderStatus.IN_TRANSIT, pickupLocation: "123 Main St" }

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(order),
          update: jest.fn().mockResolvedValue(updatedOrder),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      })
    })

    const result = await OrderService.schedulePickup(ORDER_ID, SELLER_ID, {
      pickupLocation: "123 Main St",
    })

    expect(result.status).toBe(OrderStatus.IN_TRANSIT)
    expect(result.pickupLocation).toBe("123 Main St")
  })

  it("rejects buyer scheduling pickup with not found error", async () => {
    // Buyer is not seller — findFirst returns null (WHERE sellerId = buyerId finds nothing)
    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(
      OrderService.schedulePickup(ORDER_ID, BUYER_ID, { pickupLocation: "123 Main St" })
    ).rejects.toThrow(NotFoundError)
  })

  it("closes out order and marks listing sold", async () => {
    const order = makeOrder({ sellerId: SELLER_ID })
    const now = new Date()
    const completedOrder = { ...order, status: OrderStatus.COMPLETED, completedAt: now }
    const listingUpdate = jest.fn().mockResolvedValue({ id: LISTING_ID, status: ListingStatus.SOLD, soldAt: now })

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(order),
          update: jest.fn().mockResolvedValue(completedOrder),
        },
        listing: { update: listingUpdate },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      })
    })

    const closed = await OrderService.closeout(ORDER_ID, SELLER_ID)

    expect(closed.status).toBe(OrderStatus.COMPLETED)
    expect(closed.completedAt).toBeDefined()
    expect(listingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LISTING_ID },
        data: expect.objectContaining({ status: ListingStatus.SOLD }),
      })
    )
  })

  it("rejects buyer closeout with not found error", async () => {
    // Buyer is not seller — findFirst returns null (WHERE sellerId = buyerId finds nothing)
    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        listing: { update: jest.fn() },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(OrderService.closeout(ORDER_ID, BUYER_ID)).rejects.toThrow(NotFoundError)
  })

  it("rejects closeout for undelivered delivery order", async () => {
    const deliveryOrder = makeOrder({
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      DeliveryRequest: { id: "dr-1", status: DeliveryStatus.IN_TRANSIT },
    })

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(deliveryOrder),
          update: jest.fn(),
        },
        listing: { update: jest.fn() },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(OrderService.closeout(ORDER_ID, SELLER_ID)).rejects.toThrow(
      "Delivery order must be delivered before closeout"
    )
  })

  it("schedulePickup: rejects when concurrent status change happens inside transaction", async () => {
    const order = makeOrder()

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue({
            ...order,
            status: OrderStatus.COMPLETED,
            Listing: {},
          }),
          update: jest.fn(),
        },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(
      OrderService.schedulePickup(ORDER_ID, BUYER_ID, { pickupLocation: "123 Main St" })
    ).rejects.toThrow("Pickup can only be scheduled for pending, paid, or in-transit orders")
  })

  it("closeout: rejects when concurrent status change happens inside transaction", async () => {
    const order = makeOrder()

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue({
            ...order,
            status: OrderStatus.COMPLETED,
            DeliveryRequest: null,
            Listing: {},
          }),
          update: jest.fn(),
        },
        listing: { update: jest.fn() },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(
      OrderService.closeout(ORDER_ID, SELLER_ID)
    ).rejects.toThrow("Order cannot be closed out from current status")
  })

  it("completeOrder transitions IN_TRANSIT order to COMPLETED (buyer)", async () => {
    const order = makeOrder({ status: OrderStatus.IN_TRANSIT })
    const now = new Date()
    const completedOrder = { ...order, status: OrderStatus.COMPLETED, completedAt: now }

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(order),
          update: jest.fn().mockResolvedValue(completedOrder),
        },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      })
    })

    const result = await OrderService.completeOrder(ORDER_ID, BUYER_ID)

    expect(result.status).toBe(OrderStatus.COMPLETED)
    expect(result.completedAt).toBeDefined()
  })

  it("completeOrder rejects seller (not buyer) with NotFoundError", async () => {
    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(OrderService.completeOrder(ORDER_ID, SELLER_ID)).rejects.toThrow(NotFoundError)
  })

  it("completeOrder rejects order not in IN_TRANSIT status", async () => {
    const order = makeOrder({ status: OrderStatus.PAID })

    jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
      return fn({
        order: {
          findFirst: jest.fn().mockResolvedValue(order),
          update: jest.fn(),
        },
        auditLog: { create: jest.fn() },
      })
    })

    await expect(OrderService.completeOrder(ORDER_ID, BUYER_ID)).rejects.toThrow(
      "Order must be in IN_TRANSIT status to confirm receipt"
    )
  })
})
