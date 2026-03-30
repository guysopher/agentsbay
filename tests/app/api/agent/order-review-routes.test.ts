import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { NextRequest } from "next/server"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { db } from "@/lib/db"
import { ReviewService } from "@/domain/reviews/service"
import { POST as createReviewPOST } from "@/app/api/agent/orders/[id]/review/route"
import { GET as getUserReviewsGET } from "@/app/api/agent/users/[id]/reviews/route"
import { Prisma } from "@prisma/client"

function createContext(id: string) {
  return { params: Promise.resolve({ id }) }
}

const MOCK_AUTH = {
  Agent: {
    id: "agent-1",
    userId: "buyer-1",
  },
}

describe("review API routes", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/agentbay_test"
    process.env.NEXTAUTH_URL = "http://localhost:3000"
    process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
    jest.spyOn(db, "$queryRawUnsafe").mockResolvedValue(1 as never)
  })

  describe("POST /api/agent/orders/[id]/review", () => {
    it("returns 201 with review on successful creation", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      const createReviewSpy = jest.spyOn(ReviewService, "createReview").mockResolvedValue({
        id: "review-1",
        orderId: "order-1",
        reviewerId: "buyer-1",
        revieweeId: "seller-1",
        rating: 5,
        comment: "Excellent!",
        createdAt: new Date("2026-03-29T00:00:00.000Z"),
      } as never)

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5, comment: "Excellent!" }),
        }),
        createContext("order-1")
      )

      const body = await response.json()

      expect(response.status).toBe(201)
      expect(createReviewSpy).toHaveBeenCalledWith("order-1", "buyer-1", {
        rating: 5,
        comment: "Excellent!",
      })
      expect(body.data.id).toBe("review-1")
      expect(body.data.rating).toBe(5)
    })

    it("returns 401 without auth", async () => {
      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: 5 }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(401)
    })

    it("returns 400 when rating is missing", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment: "Nice" }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(400)
    })

    it("returns 400 when rating is out of range", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 6 }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(400)
    })

    it("returns 400 when comment exceeds 1000 characters", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5, comment: "x".repeat(1001) }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(400)
    })

    it("returns 404 when order is not found", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      jest.spyOn(ReviewService, "createReview").mockRejectedValue(new NotFoundError("Order"))

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/missing/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5 }),
        }),
        createContext("missing")
      )

      expect(response.status).toBe(404)
    })

    it("returns 403 when user is not a party to the order", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      jest
        .spyOn(ReviewService, "createReview")
        .mockRejectedValue(new ForbiddenError("You are not a party to this order"))

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5 }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(403)
    })

    it("returns 400 when order is not completed", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      jest
        .spyOn(ReviewService, "createReview")
        .mockRejectedValue(new ValidationError("Reviews can only be submitted for completed orders"))

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5 }),
        }),
        createContext("order-1")
      )

      expect(response.status).toBe(400)
    })

    it("returns 400 when order has already been reviewed (P2002 duplicate)", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      const p2002Error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      })
      jest.spyOn(ReviewService, "createReview").mockRejectedValue(p2002Error)

      const response = await createReviewPOST(
        new NextRequest("http://localhost/api/agent/orders/order-1/review", {
          method: "POST",
          headers: {
            Authorization: "Bearer sk_test_123",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating: 5 }),
        }),
        createContext("order-1")
      )

      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error.message).toMatch(/already reviewed/)
    })
  })

  describe("GET /api/agent/users/[id]/reviews", () => {
    it("returns 200 with paginated reviews and aggregates", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      const getReviewsSpy = jest.spyOn(ReviewService, "getReviewsForUser").mockResolvedValue({
        items: [
          {
            id: "review-1",
            orderId: "order-1",
            reviewerId: "buyer-1",
            revieweeId: "seller-1",
            rating: 5,
            comment: "Great seller",
            createdAt: new Date("2026-03-29T00:00:00.000Z"),
          },
        ],
        nextCursor: null,
        hasMore: false,
        averageRating: 5,
        totalReviews: 1,
      } as never)

      const response = await getUserReviewsGET(
        new NextRequest("http://localhost/api/agent/users/seller-1/reviews", {
          method: "GET",
          headers: { Authorization: "Bearer sk_test_123" },
        }),
        createContext("seller-1")
      )

      const body = await response.json()

      expect(response.status).toBe(200)
      expect(getReviewsSpy).toHaveBeenCalledWith("seller-1", { cursor: undefined, limit: 20 })
      expect(body.data.reviews).toHaveLength(1)
      expect(body.data.meta.averageRating).toBe(5)
      expect(body.data.meta.totalReviews).toBe(1)
      expect(body.data.hasMore).toBe(false)
      expect(body.data.nextCursor).toBeNull()
    })

    it("returns 401 without auth", async () => {
      const response = await getUserReviewsGET(
        new NextRequest("http://localhost/api/agent/users/seller-1/reviews", {
          method: "GET",
        }),
        createContext("seller-1")
      )

      expect(response.status).toBe(401)
    })

    it("respects cursor and limit query params", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      const getReviewsSpy = jest.spyOn(ReviewService, "getReviewsForUser").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
        averageRating: null,
        totalReviews: 0,
      } as never)

      await getUserReviewsGET(
        new NextRequest(
          "http://localhost/api/agent/users/seller-1/reviews?cursor=review-5&limit=10",
          {
            method: "GET",
            headers: { Authorization: "Bearer sk_test_123" },
          }
        ),
        createContext("seller-1")
      )

      expect(getReviewsSpy).toHaveBeenCalledWith("seller-1", {
        cursor: "review-5",
        limit: 10,
      })
    })

    it("caps limit at 50", async () => {
      jest.spyOn(db.agentCredential, "findFirst").mockResolvedValue(MOCK_AUTH as never)
      const getReviewsSpy = jest.spyOn(ReviewService, "getReviewsForUser").mockResolvedValue({
        items: [],
        nextCursor: null,
        hasMore: false,
        averageRating: null,
        totalReviews: 0,
      } as never)

      await getUserReviewsGET(
        new NextRequest(
          "http://localhost/api/agent/users/seller-1/reviews?limit=100",
          {
            method: "GET",
            headers: { Authorization: "Bearer sk_test_123" },
          }
        ),
        createContext("seller-1")
      )

      expect(getReviewsSpy).toHaveBeenCalledWith("seller-1", {
        cursor: undefined,
        limit: 50,
      })
    })
  })
})
