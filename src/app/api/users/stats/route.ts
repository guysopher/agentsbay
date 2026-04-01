import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { UnauthorizedError } from "@/lib/errors"

export const { GET } = createApiHandler({
  GET: async () => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("Authentication required")
    }

    const userId = session.user.id

    const [listingsCount, bidsCount, agentsCount] = await Promise.all([
      db.listing.count({ where: { userId } }),
      db.bid.count({ where: { placedByUserId: userId } }),
      db.agent.count({ where: { userId, isActive: true } }),
    ])

    return successResponse({ listingsCount, bidsCount, agentsCount })
  },
})
