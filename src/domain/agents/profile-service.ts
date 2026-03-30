import { db } from "@/lib/db"
import { NotFoundError } from "@/lib/errors"
import { OrderStatus, ListingStatus } from "@prisma/client"

export interface PublicAgentProfile {
  id: string
  name: string
  description: string | null
  memberSince: string
  stats: {
    dealsCompleted: number
    activeListings: number
    avgRating: number | null
    reviewCount: number
  }
}

export interface PublicAgentListItem {
  id: string
  name: string
  description: string | null
  memberSince: string
  dealsCompleted: number
  avgRating: number | null
}

export class AgentProfileService {
  static async getPublicProfile(agentId: string): Promise<PublicAgentProfile> {
    const agent = await db.agent.findFirst({
      where: { id: agentId, isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        userId: true,
      },
    })

    if (!agent) throw new NotFoundError("Agent")

    const [dealsCompleted, activeListings, reviews] = await Promise.all([
      db.order.count({
        where: {
          status: OrderStatus.COMPLETED,
          OR: [{ buyerId: agent.userId }, { sellerId: agent.userId }],
        },
      }),
      db.listing.count({
        where: { agentId: agent.id, status: ListingStatus.PUBLISHED },
      }),
      db.review.findMany({
        where: { revieweeId: agent.userId },
        select: { rating: true },
      }),
    ])

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : null

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      memberSince: agent.createdAt.toISOString(),
      stats: {
        dealsCompleted,
        activeListings,
        avgRating: avgRating !== null ? Math.round(avgRating * 10) / 10 : null,
        reviewCount: reviews.length,
      },
    }
  }

  static async listPublic(params: {
    search?: string
    page: number
    limit: number
  }): Promise<{ items: PublicAgentListItem[]; total: number }> {
    const { search, page, limit } = params
    const skip = (page - 1) * limit

    const where = {
      isActive: true,
      deletedAt: null as null | undefined,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const [agents, total] = await Promise.all([
      db.agent.findMany({
        where,
        select: { id: true, name: true, description: true, createdAt: true, userId: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.agent.count({ where }),
    ])

    const agentUserIds = agents.map((a) => a.userId)

    const [dealCounts, reviewAggs] = await Promise.all([
      db.order.groupBy({
        by: ["buyerId"],
        where: {
          status: OrderStatus.COMPLETED,
          buyerId: { in: agentUserIds },
        },
        _count: { _all: true },
      }),
      db.review.groupBy({
        by: ["revieweeId"],
        where: { revieweeId: { in: agentUserIds } },
        _avg: { rating: true },
      }),
    ])

    // Also count deals where agent user is seller
    const sellerDealCounts = await db.order.groupBy({
      by: ["sellerId"],
      where: {
        status: OrderStatus.COMPLETED,
        sellerId: { in: agentUserIds },
      },
      _count: { _all: true },
    })

    const buyerMap = new Map(dealCounts.map((r) => [r.buyerId, r._count._all]))
    const sellerMap = new Map(sellerDealCounts.map((r) => [r.sellerId, r._count._all]))
    const reviewMap = new Map(reviewAggs.map((r) => [r.revieweeId, r._avg.rating]))

    return {
      items: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        memberSince: agent.createdAt.toISOString(),
        dealsCompleted: (buyerMap.get(agent.userId) ?? 0) + (sellerMap.get(agent.userId) ?? 0),
        avgRating: reviewMap.get(agent.userId) ?? null,
      })),
      total,
    }
  }

  static async getLeaderboard(limit = 10): Promise<PublicAgentListItem[]> {
    const agents = await db.agent.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true, description: true, createdAt: true, userId: true },
    })

    const userIds = agents.map((a) => a.userId)

    const [buyerDeals, sellerDeals, reviewAggs] = await Promise.all([
      db.order.groupBy({
        by: ["buyerId"],
        where: { status: OrderStatus.COMPLETED, buyerId: { in: userIds } },
        _count: { _all: true },
      }),
      db.order.groupBy({
        by: ["sellerId"],
        where: { status: OrderStatus.COMPLETED, sellerId: { in: userIds } },
        _count: { _all: true },
      }),
      db.review.groupBy({
        by: ["revieweeId"],
        where: { revieweeId: { in: userIds } },
        _avg: { rating: true },
      }),
    ])

    const buyerMap = new Map(buyerDeals.map((r) => [r.buyerId, r._count._all]))
    const sellerMap = new Map(sellerDeals.map((r) => [r.sellerId, r._count._all]))
    const reviewMap = new Map(reviewAggs.map((r) => [r.revieweeId, r._avg.rating]))

    return agents
      .map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        memberSince: agent.createdAt.toISOString(),
        dealsCompleted:
          (buyerMap.get(agent.userId) ?? 0) + (sellerMap.get(agent.userId) ?? 0),
        avgRating: reviewMap.get(agent.userId) ?? null,
      }))
      .sort((a, b) => b.dealsCompleted - a.dealsCompleted)
      .slice(0, limit)
  }
}
