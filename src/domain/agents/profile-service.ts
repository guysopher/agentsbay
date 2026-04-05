import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { NotFoundError } from "@/lib/errors"
import { OrderStatus, ListingStatus } from "@prisma/client"

export type LeaderboardWindow = "all" | "30d" | "7d"
export type LeaderboardSortBy = "listings_sold" | "transaction_value" | "buyer_rating"

export const LEADERBOARD_WINDOWS: LeaderboardWindow[] = ["all", "30d", "7d"]
export const LEADERBOARD_SORT_OPTIONS: LeaderboardSortBy[] = [
  "listings_sold",
  "transaction_value",
  "buyer_rating",
]

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
  transactionValue?: number | null
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

  static async getLeaderboard(params: {
    limit?: number
    window?: LeaderboardWindow
    sortBy?: LeaderboardSortBy
  } = {}): Promise<PublicAgentListItem[]> {
    const { limit = 10, window = "all", sortBy = "listings_sold" } = params

    const cutoff =
      window === "30d"
        ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        : window === "7d"
          ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          : null

    const windowFilter = cutoff
      ? Prisma.sql`AND "createdAt" >= ${cutoff}`
      : Prisma.empty

    // Always fetch order metrics (deal count + transaction value) in one UNION query
    const orderRows = await db.$queryRaw<
      { userId: string; dealCount: bigint; totalValue: bigint }[]
    >(
      Prisma.sql`
        SELECT "userId", SUM(cnt) AS "dealCount", SUM(val) AS "totalValue"
        FROM (
          SELECT "buyerId" AS "userId", COUNT(*) AS cnt, SUM(amount) AS val
            FROM "Order"
           WHERE status = 'COMPLETED' ${windowFilter}
           GROUP BY "buyerId"
          UNION ALL
          SELECT "sellerId" AS "userId", COUNT(*) AS cnt, SUM(amount) AS val
            FROM "Order"
           WHERE status = 'COMPLETED' ${windowFilter}
           GROUP BY "sellerId"
        ) combined
        GROUP BY "userId"
        LIMIT ${limit * 10}
      `
    )

    const dealMap = new Map(orderRows.map((r) => [r.userId, Number(r.dealCount)]))
    const valueMap = new Map(orderRows.map((r) => [r.userId, Number(r.totalValue)]))

    // For buyer_rating: fetch review aggregations to determine ranking order
    let ratingRankMap: Map<string, number> = new Map()
    if (sortBy === "buyer_rating") {
      const reviewRankRows = await db.$queryRaw<{ userId: string; avgRating: number }[]>(
        cutoff
          ? Prisma.sql`
              SELECT "revieweeId" AS "userId", AVG(rating)::float AS "avgRating"
                FROM "Review"
               WHERE "createdAt" >= ${cutoff}
               GROUP BY "revieweeId"
               ORDER BY "avgRating" DESC
               LIMIT ${limit * 3}
            `
          : Prisma.sql`
              SELECT "revieweeId" AS "userId", AVG(rating)::float AS "avgRating"
                FROM "Review"
               GROUP BY "revieweeId"
               ORDER BY "avgRating" DESC
               LIMIT ${limit * 3}
            `
      )
      ratingRankMap = new Map(reviewRankRows.map((r) => [r.userId, r.avgRating]))
    }

    // Determine the candidate user set for this sort
    const candidateUserIds =
      sortBy === "buyer_rating"
        ? Array.from(ratingRankMap.keys())
        : orderRows.map((r) => r.userId)

    if (candidateUserIds.length === 0) {
      // Fallback: return newest agents when no data exists for the window
      const agents = await db.agent.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true, createdAt: true, userId: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
      return agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        memberSince: agent.createdAt.toISOString(),
        dealsCompleted: 0,
        avgRating: null,
        transactionValue: null,
      }))
    }

    const [agents, reviewAggs] = await Promise.all([
      db.agent.findMany({
        where: { isActive: true, deletedAt: null, userId: { in: candidateUserIds } },
        select: { id: true, name: true, description: true, createdAt: true, userId: true },
        take: limit * 3,
      }),
      db.review.groupBy({
        by: ["revieweeId"],
        where: { revieweeId: { in: candidateUserIds } },
        _avg: { rating: true },
      }),
    ])

    const reviewMap = new Map(reviewAggs.map((r) => [r.revieweeId, r._avg.rating]))

    const mapped = agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      memberSince: agent.createdAt.toISOString(),
      dealsCompleted: dealMap.get(agent.userId) ?? 0,
      avgRating:
        sortBy === "buyer_rating"
          ? (ratingRankMap.get(agent.userId) ?? reviewMap.get(agent.userId) ?? null)
          : (reviewMap.get(agent.userId) ?? null),
      transactionValue: valueMap.get(agent.userId) ?? null,
    }))

    if (sortBy === "transaction_value") {
      mapped.sort((a, b) => (b.transactionValue ?? 0) - (a.transactionValue ?? 0))
    } else if (sortBy === "buyer_rating") {
      mapped.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    } else {
      mapped.sort((a, b) => b.dealsCompleted - a.dealsCompleted)
    }

    return mapped.slice(0, limit)
  }
}
