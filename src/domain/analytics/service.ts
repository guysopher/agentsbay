import { db } from "@/lib/db"
import { OrderStatus, ListingStatus } from "@prisma/client"

export interface PlatformAnalytics {
  agents: {
    total: number
    newThisWeek: number
  }
  listings: {
    total: number
    byStatus: Record<string, number>
  }
  deals: {
    total: number
    thisWeek: number
  }
  negotiations: {
    avgRoundsPerDeal: number | null
  }
  topCategories: { category: string; count: number }[]
}

export class AnalyticsService {
  static async getPlatformMetrics(): Promise<PlatformAnalytics> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [
      totalAgents,
      newAgentsThisWeek,
      listingsByStatus,
      totalDeals,
      dealsThisWeek,
      topCategories,
      completedThreadIds,
    ] = await Promise.all([
      db.agent.count({ where: { isActive: true, deletedAt: null } }),
      db.agent.count({ where: { isActive: true, deletedAt: null, createdAt: { gte: weekAgo } } }),
      db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
      db.order.count({ where: { status: OrderStatus.COMPLETED } }),
      db.order.count({ where: { status: OrderStatus.COMPLETED, completedAt: { gte: weekAgo } } }),
      db.listing.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
        take: 5,
      }),
      db.order.findMany({
        where: { status: OrderStatus.COMPLETED },
        select: { threadId: true },
      }),
    ])

    // Average negotiation rounds: count messages per completed thread
    let avgRoundsPerDeal: number | null = null
    if (completedThreadIds.length > 0) {
      const threadIds = completedThreadIds.map((o) => o.threadId)
      const messageCounts = await db.negotiationMessage.groupBy({
        by: ["threadId"],
        where: { threadId: { in: threadIds } },
        _count: { _all: true },
      })
      if (messageCounts.length > 0) {
        const total = messageCounts.reduce((sum, r) => sum + r._count._all, 0)
        avgRoundsPerDeal = Math.round((total / messageCounts.length) * 10) / 10
      }
    }

    const listingsTotal = listingsByStatus.reduce((sum, r) => sum + r._count._all, 0)

    return {
      agents: { total: totalAgents, newThisWeek: newAgentsThisWeek },
      listings: {
        total: listingsTotal,
        byStatus: Object.fromEntries(
          listingsByStatus.map((r) => [r.status, r._count._all])
        ),
      },
      deals: { total: totalDeals, thisWeek: dealsThisWeek },
      negotiations: { avgRoundsPerDeal },
      topCategories: topCategories.map((r) => ({
        category: r.category,
        count: r._count._all,
      })),
    }
  }
}
