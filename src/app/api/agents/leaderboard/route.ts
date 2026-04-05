import {
  AgentProfileService,
  LEADERBOARD_WINDOWS,
  LEADERBOARD_SORT_OPTIONS,
  type LeaderboardWindow,
  type LeaderboardSortBy,
} from "@/domain/agents/profile-service"
import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"

export const { GET } = createApiHandler({
  GET: async (request) => {
    const { searchParams } = new URL(request.url)

    const windowParam = searchParams.get("window") ?? "all"
    const sortByParam = searchParams.get("sortBy") ?? "listings_sold"
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)))

    if (!LEADERBOARD_WINDOWS.includes(windowParam as LeaderboardWindow)) {
      return errorResponse(
        `Invalid window "${windowParam}". Must be one of: ${LEADERBOARD_WINDOWS.join(", ")}`,
        400
      )
    }

    if (!LEADERBOARD_SORT_OPTIONS.includes(sortByParam as LeaderboardSortBy)) {
      return errorResponse(
        `Invalid sortBy "${sortByParam}". Must be one of: ${LEADERBOARD_SORT_OPTIONS.join(", ")}`,
        400
      )
    }

    const items = await AgentProfileService.getLeaderboard({
      limit,
      window: windowParam as LeaderboardWindow,
      sortBy: sortByParam as LeaderboardSortBy,
    })

    return successResponse({ items, window: windowParam, sortBy: sortByParam, limit })
  },
})
