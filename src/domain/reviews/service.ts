import { db } from "@/lib/db"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { OrderStatus, ReputationEventType } from "@prisma/client"
import { randomUUID } from "crypto"
import type { CreateReviewInput } from "./validation"

interface GetReviewsForUserOptions {
  cursor?: string
  limit?: number
}

interface GetReviewsForUserResult {
  items: Array<{
    id: string
    orderId: string
    reviewerId: string
    revieweeId: string
    rating: number
    comment: string | null
    createdAt: Date
  }>
  nextCursor: string | null
  hasMore: boolean
  averageRating: number | null
  totalReviews: number
}

export class ReviewService {
  static async createReview(orderId: string, reviewerId: string, input: CreateReviewInput) {
    return db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        throw new NotFoundError("Order")
      }

      if (order.status !== OrderStatus.COMPLETED) {
        throw new ValidationError("Reviews can only be submitted for completed orders")
      }

      if (order.buyerId !== reviewerId && order.sellerId !== reviewerId) {
        throw new ForbiddenError("You are not a party to this order")
      }

      // Derive reviewee from reviewer's role
      const revieweeId = order.buyerId === reviewerId ? order.sellerId : order.buyerId

      const review = await tx.review.create({
        data: {
          id: randomUUID(),
          orderId,
          reviewerId,
          revieweeId,
          rating: input.rating,
          comment: input.comment ?? null,
        },
      })

      // Create reputation event based on rating
      if (input.rating >= 4) {
        await tx.reputationEvent.create({
          data: {
            id: randomUUID(),
            userId: revieweeId,
            type: ReputationEventType.POSITIVE_REVIEW,
            points: 10,
            reason: `Received a ${input.rating}-star review`,
          },
        })
      } else if (input.rating <= 2) {
        await tx.reputationEvent.create({
          data: {
            id: randomUUID(),
            userId: revieweeId,
            type: ReputationEventType.NEGATIVE_REVIEW,
            points: -5,
            reason: `Received a ${input.rating}-star review`,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          userId: reviewerId,
          action: "review.created",
          entityType: "review",
          entityId: review.id,
          metadata: {
            orderId,
            revieweeId,
            rating: input.rating,
          },
        },
      })

      return review
    })
  }

  static async getReviewsForUser(
    userId: string,
    options: GetReviewsForUserOptions = {}
  ): Promise<GetReviewsForUserResult> {
    const limit = options.limit ?? 20

    const [reviews, totalReviews] = await Promise.all([
      db.review.findMany({
        where: { revieweeId: userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(options.cursor && {
          cursor: { id: options.cursor },
          skip: 1,
        }),
      }),
      db.review.count({ where: { revieweeId: userId } }),
    ])

    const hasMore = reviews.length > limit
    const items = hasMore ? reviews.slice(0, limit) : reviews
    const nextCursor = hasMore ? items[items.length - 1].id : null

    const averageRating = totalReviews > 0
      ? await db.review
          .aggregate({
            where: { revieweeId: userId },
            _avg: { rating: true },
          })
          .then((r) => r._avg.rating)
      : null

    return {
      items: items.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        reviewerId: r.reviewerId,
        revieweeId: r.revieweeId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      nextCursor,
      hasMore,
      averageRating,
      totalReviews,
    }
  }

  static async getReviewForOrder(orderId: string, reviewerId: string) {
    return db.review.findUnique({
      where: { orderId_reviewerId: { orderId, reviewerId } },
    })
  }

  static async getAverageRating(userId: string) {
    const [result, count] = await Promise.all([
      db.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
      }),
      db.review.count({ where: { revieweeId: userId } }),
    ])

    return {
      average: result._avg.rating,
      count,
    }
  }
}
