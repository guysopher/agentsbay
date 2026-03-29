import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { OrderStatus, ReputationEventType } from "@prisma/client"
import { ReviewService } from "@/domain/reviews/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { db } from "@/lib/db"

const BUYER_ID = "buyer-1"
const SELLER_ID = "seller-1"
const ORDER_ID = "order-1"

function makeOrder(overrides: Partial<{
  id: string
  buyerId: string
  sellerId: string
  status: OrderStatus
}> = {}) {
  return {
    id: ORDER_ID,
    buyerId: BUYER_ID,
    sellerId: SELLER_ID,
    status: OrderStatus.COMPLETED,
    ...overrides,
  }
}

describe("ReviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("createReview", () => {
    function mockTransaction(order: object | null) {
      return jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: {
            findUnique: jest.fn().mockResolvedValue(order),
          },
          review: {
            create: jest.fn().mockResolvedValue({
              id: "review-1",
              orderId: ORDER_ID,
              reviewerId: BUYER_ID,
              revieweeId: SELLER_ID,
              rating: 5,
              comment: null,
              createdAt: new Date(),
            }),
          },
          reputationEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })
      })
    }

    it("creates a review on a completed order (buyer reviewing seller)", async () => {
      const auditLogCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: {
            findUnique: jest.fn().mockResolvedValue(makeOrder()),
          },
          review: {
            create: jest.fn().mockResolvedValue({
              id: "review-1",
              orderId: ORDER_ID,
              reviewerId: BUYER_ID,
              revieweeId: SELLER_ID,
              rating: 5,
              comment: null,
              createdAt: new Date(),
            }),
          },
          reputationEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: auditLogCreateMock,
          },
        })
      })

      const review = await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 5 })

      expect(review.orderId).toBe(ORDER_ID)
      expect(review.reviewerId).toBe(BUYER_ID)
      expect(auditLogCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "review.created",
            entityType: "review",
            userId: expect.any(String),
          }),
        })
      )
    })

    it("creates a review on a completed order (seller reviewing buyer)", async () => {
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: {
            findUnique: jest.fn().mockResolvedValue(makeOrder()),
          },
          review: {
            create: jest.fn().mockImplementation(({ data }: any) =>
              Promise.resolve({ id: "review-2", ...data, createdAt: new Date() })
            ),
          },
          reputationEvent: {
            create: jest.fn().mockResolvedValue({}),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        })
      })

      const review = await ReviewService.createReview(ORDER_ID, SELLER_ID, { rating: 4 })
      expect(review.reviewerId).toBe(SELLER_ID)
      expect(review.revieweeId).toBe(BUYER_ID)
    })

    it("throws NotFoundError when order does not exist", async () => {
      mockTransaction(null)

      await expect(ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 5 })).rejects.toThrow(
        NotFoundError
      )
    })

    it("throws ValidationError when order is not COMPLETED", async () => {
      mockTransaction(makeOrder({ status: OrderStatus.PAID }))

      await expect(ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 5 })).rejects.toThrow(
        ValidationError
      )
    })

    it("throws ForbiddenError when reviewer is not a party to the order", async () => {
      mockTransaction(makeOrder())

      await expect(
        ReviewService.createReview(ORDER_ID, "outsider-99", { rating: 5 })
      ).rejects.toThrow(ForbiddenError)
    })

    it("creates POSITIVE_REVIEW reputation event for rating 5", async () => {
      const reputationCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: { findUnique: jest.fn().mockResolvedValue(makeOrder()) },
          review: { create: jest.fn().mockResolvedValue({ id: "r1" } as never) },
          reputationEvent: { create: reputationCreateMock },
          auditLog: { create: jest.fn().mockResolvedValue({} as never) },
        })
      })

      await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 5 })

      expect(reputationCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ReputationEventType.POSITIVE_REVIEW, points: 10 }),
        })
      )
    })

    it("creates POSITIVE_REVIEW reputation event for rating 4", async () => {
      const reputationCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: { findUnique: jest.fn().mockResolvedValue(makeOrder()) },
          review: { create: jest.fn().mockResolvedValue({ id: "r1" } as never) },
          reputationEvent: { create: reputationCreateMock },
          auditLog: { create: jest.fn().mockResolvedValue({} as never) },
        })
      })

      await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 4 })

      expect(reputationCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ReputationEventType.POSITIVE_REVIEW }),
        })
      )
    })

    it("creates NEGATIVE_REVIEW reputation event for rating 2", async () => {
      const reputationCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: { findUnique: jest.fn().mockResolvedValue(makeOrder()) },
          review: { create: jest.fn().mockResolvedValue({ id: "r1" } as never) },
          reputationEvent: { create: reputationCreateMock },
          auditLog: { create: jest.fn().mockResolvedValue({} as never) },
        })
      })

      await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 2 })

      expect(reputationCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ReputationEventType.NEGATIVE_REVIEW, points: -5 }),
        })
      )
    })

    it("creates NEGATIVE_REVIEW reputation event for rating 1", async () => {
      const reputationCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: { findUnique: jest.fn().mockResolvedValue(makeOrder()) },
          review: { create: jest.fn().mockResolvedValue({ id: "r1" } as never) },
          reputationEvent: { create: reputationCreateMock },
          auditLog: { create: jest.fn().mockResolvedValue({} as never) },
        })
      })

      await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 1 })

      expect(reputationCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: ReputationEventType.NEGATIVE_REVIEW }),
        })
      )
    })

    it("does not create a reputation event for rating 3", async () => {
      const reputationCreateMock = jest.fn().mockResolvedValue({} as never)
      jest.spyOn(db, "$transaction").mockImplementationOnce(async (fn: any) => {
        return fn({
          order: { findUnique: jest.fn().mockResolvedValue(makeOrder()) },
          review: { create: jest.fn().mockResolvedValue({ id: "r1" } as never) },
          reputationEvent: { create: reputationCreateMock },
          auditLog: { create: jest.fn().mockResolvedValue({} as never) },
        })
      })

      await ReviewService.createReview(ORDER_ID, BUYER_ID, { rating: 3 })

      expect(reputationCreateMock).not.toHaveBeenCalled()
    })
  })

  describe("getReviewsForUser", () => {
    it("returns paginated reviews with averageRating and totalReviews", async () => {
      const reviews = [
        { id: "r1", orderId: "o1", reviewerId: BUYER_ID, revieweeId: SELLER_ID, rating: 5, comment: null, createdAt: new Date() },
        { id: "r2", orderId: "o2", reviewerId: BUYER_ID, revieweeId: SELLER_ID, rating: 4, comment: "Great!", createdAt: new Date() },
      ]

      jest.spyOn(db.review, "findMany").mockResolvedValue(reviews as never)
      jest.spyOn(db.review, "count").mockResolvedValue(2 as never)
      jest.spyOn(db.review, "aggregate").mockResolvedValue({ _avg: { rating: 4.5 } } as never)

      const result = await ReviewService.getReviewsForUser(SELLER_ID)

      expect(result.items).toHaveLength(2)
      expect(result.totalReviews).toBe(2)
      expect(result.averageRating).toBe(4.5)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it("paginates using cursor when there are more results", async () => {
      const reviews = Array.from({ length: 21 }, (_, i) => ({
        id: `r${i}`,
        orderId: `o${i}`,
        reviewerId: BUYER_ID,
        revieweeId: SELLER_ID,
        rating: 5,
        comment: null,
        createdAt: new Date(),
      }))

      jest.spyOn(db.review, "findMany").mockResolvedValue(reviews as never)
      jest.spyOn(db.review, "count").mockResolvedValue(25 as never)
      jest.spyOn(db.review, "aggregate").mockResolvedValue({ _avg: { rating: 5 } } as never)

      const result = await ReviewService.getReviewsForUser(SELLER_ID, { limit: 20 })

      expect(result.items).toHaveLength(20)
      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).toBe("r19")
    })

    it("returns null averageRating when user has no reviews", async () => {
      jest.spyOn(db.review, "findMany").mockResolvedValue([] as never)
      jest.spyOn(db.review, "count").mockResolvedValue(0 as never)

      const result = await ReviewService.getReviewsForUser(SELLER_ID)

      expect(result.averageRating).toBeNull()
      expect(result.totalReviews).toBe(0)
    })
  })

  describe("getReviewForOrder", () => {
    it("returns existing review for order and reviewer", async () => {
      const review = { id: "r1", orderId: ORDER_ID, reviewerId: BUYER_ID }
      jest.spyOn(db.review, "findUnique").mockResolvedValue(review as never)

      const result = await ReviewService.getReviewForOrder(ORDER_ID, BUYER_ID)

      expect(result).toEqual(review)
      expect(db.review.findUnique).toHaveBeenCalledWith({
        where: { orderId_reviewerId: { orderId: ORDER_ID, reviewerId: BUYER_ID } },
      })
    })

    it("returns null when review does not exist", async () => {
      jest.spyOn(db.review, "findUnique").mockResolvedValue(null as never)

      const result = await ReviewService.getReviewForOrder(ORDER_ID, BUYER_ID)

      expect(result).toBeNull()
    })
  })

  describe("getAverageRating", () => {
    it("returns average and count for user with reviews", async () => {
      jest.spyOn(db.review, "aggregate").mockResolvedValue({ _avg: { rating: 4.2 } } as never)
      jest.spyOn(db.review, "count").mockResolvedValue(10 as never)

      const result = await ReviewService.getAverageRating(SELLER_ID)

      expect(result.average).toBe(4.2)
      expect(result.count).toBe(10)
    })
  })
})
