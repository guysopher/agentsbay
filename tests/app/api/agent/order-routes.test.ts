import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { db } from "@/lib/db"
import { OrderService } from "@/domain/orders/service"
import { GET as listOrdersGET } from "@/app/api/agent/orders/route"
import { GET as getOrderGET } from "@/app/api/agent/orders/[id]/route"
import { POST as pickupOrderPOST } from "@/app/api/agent/orders/[id]/pickup/route"
import { POST as closeoutOrderPOST } from "@/app/api/agent/orders/[id]/closeout/route"

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe("order API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
  })

  it("lists orders for authenticated user", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const listByUserSpy = jest.spyOn(OrderService, "listByUser").mockResolvedValue({
      items: [
        {
          id: "order-1",
          status: "PAID" as never,
          listingId: "listing-1",
          listingTitle: "Vintage Chair",
          amount: 9200,
          fulfillmentMethod: "PICKUP" as never,
          pickupLocation: null,
          deliveryAddress: null,
          buyerId: "buyer-1",
          sellerId: "seller-1",
          createdAt: new Date("2026-03-28T00:00:00.000Z"),
          updatedAt: new Date("2026-03-28T00:00:00.000Z"),
        },
      ],
      nextCursor: null,
      hasMore: false,
    })

    const response = await listOrdersGET(
      new NextRequest("http://localhost/api/agent/orders", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      })
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(listByUserSpy).toHaveBeenCalledWith("buyer-1", { status: undefined, cursor: undefined, limit: 20 })
    expect(body.data.orders).toHaveLength(1)
    expect(body.data.orders[0].id).toBe("order-1")
    expect(body.data.hasMore).toBe(false)
    expect(body.data.nextCursor).toBeNull()
  })

  it("filters orders by status query param", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const listByUserSpy = jest.spyOn(OrderService, "listByUser").mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    })

    const response = await listOrdersGET(
      new NextRequest("http://localhost/api/agent/orders?status=PAID,IN_TRANSIT", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      })
    )

    expect(response.status).toBe(200)
    expect(listByUserSpy).toHaveBeenCalledWith("buyer-1", {
      status: ["PAID", "IN_TRANSIT"],
      cursor: undefined,
      limit: 20,
    })
  })

  it("returns 401 when listing orders without auth", async () => {
    const response = await listOrdersGET(
      new NextRequest("http://localhost/api/agent/orders", {
        method: "GET",
      })
    )

    expect(response.status).toBe(401)
  })

  it("does not return other users orders", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const listByUserSpy = jest.spyOn(OrderService, "listByUser").mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    })

    await listOrdersGET(
      new NextRequest("http://localhost/api/agent/orders", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      })
    )

    // Service is called with the authenticated user's id — scoping is enforced in the service
    expect(listByUserSpy).toHaveBeenCalledWith("buyer-1", expect.anything())
  })

  it("fails fast when runtime bootstrap env is missing", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL
    const originalNextAuthUrl = process.env.NEXTAUTH_URL
    const originalNextAuthSecret = process.env.NEXTAUTH_SECRET

    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_URL
    delete process.env.NEXTAUTH_SECRET

    try {
      const response = await getOrderGET(
        new NextRequest("http://localhost/api/agent/orders/order-1", {
          method: "GET",
          headers: {
            Authorization: "Bearer sk_test_123",
          },
        }),
        createContext("order-1")
      )

      const body = await response.json()

      expect(response.status).toBe(503)
      expect(body.error.code).toBe("SERVICE_UNAVAILABLE")
      expect(body.error.details.missingEnv).toEqual(
        expect.arrayContaining(["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"])
      )
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = originalDatabaseUrl
      }

      if (originalNextAuthUrl === undefined) {
        delete process.env.NEXTAUTH_URL
      } else {
        process.env.NEXTAUTH_URL = originalNextAuthUrl
      }

      if (originalNextAuthSecret === undefined) {
        delete process.env.NEXTAUTH_SECRET
      } else {
        process.env.NEXTAUTH_SECRET = originalNextAuthSecret
      }
    }
  })

  it("fetches an order successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const getByIdSpy = jest.spyOn(OrderService, "getById").mockResolvedValue({
      id: "order-1",
      status: "PAID",
      amount: 9200,
      fulfillmentMethod: "PICKUP",
      pickupLocation: null,
      deliveryAddress: null,
      completedAt: null,
      cancelledAt: null,
      Listing: {
        id: "listing-1",
        title: "Vintage Chair",
        status: "RESERVED",
        price: 9200,
        currency: "USD",
      },
      DeliveryRequest: null,
      createdAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    } as never)

    const response = await getOrderGET(
      new NextRequest("http://localhost/api/agent/orders/order-1", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(getByIdSpy).toHaveBeenCalledWith("order-1", "buyer-1")
    expect(body.data.id).toBe("order-1")
    expect(body.data.listing.id).toBe("listing-1")
  })

  it("rejects order fetch without auth", async () => {
    const response = await getOrderGET(
      new NextRequest("http://localhost/api/agent/orders/order-1", {
        method: "GET",
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 404 when fetching an order outside agent scope", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "outsider-1",
      },
    } as never)
    jest.spyOn(OrderService, "getById").mockRejectedValue(new NotFoundError("Order"))

    const response = await getOrderGET(
      new NextRequest("http://localhost/api/agent/orders/order-1", {
        method: "GET",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(404)
  })

  it("schedules pickup successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    const schedulePickupSpy = jest.spyOn(OrderService, "schedulePickup").mockResolvedValue({
      id: "order-1",
      status: "IN_TRANSIT",
      pickupLocation: "123 Main St",
      updatedAt: "2026-03-28T00:00:00.000Z",
    } as never)

    const response = await pickupOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/pickup", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pickupLocation: "123 Main St" }),
      }),
      createContext("order-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(schedulePickupSpy).toHaveBeenCalledWith("order-1", "buyer-1", {
      pickupLocation: "123 Main St",
    })
    expect(body.data.status).toBe("IN_TRANSIT")
  })

  it("returns 400 for invalid pickup payloads", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)

    const response = await pickupOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/pickup", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pickupLocation: "x" }),
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 400 for invalid pickup state transitions", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    jest
      .spyOn(OrderService, "schedulePickup")
      .mockRejectedValue(
        new ValidationError("Pickup can only be scheduled for pending, paid, or in-transit orders")
      )

    const response = await pickupOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/pickup", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pickupLocation: "123 Main St" }),
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 404 when scheduling pickup for an unknown order", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-1",
        userId: "buyer-1",
      },
    } as never)
    jest.spyOn(OrderService, "schedulePickup").mockRejectedValue(new NotFoundError("Order"))

    const response = await pickupOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/missing/pickup", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pickupLocation: "123 Main St" }),
      }),
      createContext("missing")
    )

    expect(response.status).toBe(404)
  })

  it("closes out an order successfully", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    const closeoutSpy = jest.spyOn(OrderService, "closeout").mockResolvedValue({
      id: "order-1",
      status: "COMPLETED",
      completedAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    } as never)

    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/closeout", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(closeoutSpy).toHaveBeenCalledWith("order-1", "seller-1")
    expect(body.data.status).toBe("COMPLETED")
  })

  it("rejects closeout without auth", async () => {
    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/closeout", {
        method: "POST",
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(401)
  })

  it("returns 400 for invalid closeout state transitions", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest
      .spyOn(OrderService, "closeout")
      .mockRejectedValue(new ValidationError("Order cannot be closed out from current status"))

    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/closeout", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(400)
  })

  it("returns 404 when closing out an unknown order", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-2",
        userId: "seller-1",
      },
    } as never)
    jest.spyOn(OrderService, "closeout").mockRejectedValue(new NotFoundError("Order"))

    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/missing/closeout", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("missing")
    )

    expect(response.status).toBe(404)
  })

  it("returns 404 when buyer agent attempts closeout (seller-only)", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-buyer",
        userId: "buyer-1",
      },
    } as never)
    // Service returns NotFoundError because buyer's userId does not match sellerId
    jest.spyOn(OrderService, "closeout").mockRejectedValue(new NotFoundError("Order"))

    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/closeout", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    expect(response.status).toBe(404)
  })

  it("seller agent closeout succeeds and returns completed order", async () => {
    jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue({
      Agent: {
        id: "agent-seller",
        userId: "seller-1",
      },
    } as never)
    const closeoutSpy = jest.spyOn(OrderService, "closeout").mockResolvedValue({
      id: "order-1",
      status: "COMPLETED",
      completedAt: "2026-03-28T00:00:00.000Z",
      updatedAt: "2026-03-28T00:00:00.000Z",
    } as never)

    const response = await closeoutOrderPOST(
      new NextRequest("http://localhost/api/agent/orders/order-1/closeout", {
        method: "POST",
        headers: {
          Authorization: "Bearer sk_test_123",
        },
      }),
      createContext("order-1")
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(closeoutSpy).toHaveBeenCalledWith("order-1", "seller-1")
    expect(body.data.status).toBe("COMPLETED")
  })
})
