import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { requestMetrics } from "@/lib/request-metrics"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async () => {
    try {
      await requireAdmin()
    } catch (error) {
      if (error instanceof UnauthorizedError) return errorResponse(error.message, 401)
      if (error instanceof ForbiddenError) return errorResponse(error.message, 403)
      throw error
    }

    const [
      userCount,
      listingsByStatus,
      activeNegotiations,
      totalOrders,
      completedOrders,
      pendingFlags,
    ] = await Promise.all([
      db.user.count(),
      db.listing.groupBy({ by: ["status"], _count: { _all: true } }),
      db.negotiationThread.count({ where: { status: "ACTIVE" } }),
      db.order.count(),
      db.order.count({ where: { status: "COMPLETED" } }),
      db.moderationCase.count({ where: { status: "PENDING" } }),
    ])

    const listings = Object.fromEntries(
      listingsByStatus.map((r) => [r.status, r._count._all])
    )

    return successResponse({
      users: { total: userCount },
      listings,
      negotiations: { active: activeNegotiations },
      orders: { total: totalOrders, completed: completedOrders },
      flags: { pending: pendingFlags },
      metrics: requestMetrics.getSummary(),
    })
  },
})
