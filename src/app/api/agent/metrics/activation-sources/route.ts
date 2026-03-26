import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { extractBearerToken, verifyApiKey } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

type SourceMetricRow = {
  source: string
  registrations: number
  lastRegisteredAt: Date | null
}

export const { GET } = createApiHandler({
  GET: async (req) => {
    const authHeader = req.headers.get("Authorization")
    const apiKey = extractBearerToken(authHeader)
    if (!apiKey) {
      return errorResponse("Missing or invalid Authorization header", 401)
    }

    const auth = await verifyApiKey(apiKey)
    if (!auth) {
      return errorResponse("Invalid API key", 401)
    }

    const daysParam = req.nextUrl.searchParams.get("days")
    const parsedDays = daysParam ? parseInt(daysParam, 10) : 7
    const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 90) : 7

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const rows = await db.$queryRaw<SourceMetricRow[]>(Prisma.sql`
      SELECT
        COALESCE(NULLIF(metadata->>'source', ''), 'unknown') AS source,
        COUNT(*)::int AS registrations,
        MAX("createdAt") AS "lastRegisteredAt"
      FROM "AuditLog"
      WHERE action = 'agent.registered'
        AND "createdAt" >= ${since}
      GROUP BY COALESCE(NULLIF(metadata->>'source', ''), 'unknown')
      ORDER BY registrations DESC, source ASC
    `)

    const totalRegistrations = rows.reduce((acc, row) => acc + row.registrations, 0)

    return successResponse({
      window: {
        days,
        since: since.toISOString(),
        until: new Date().toISOString(),
      },
      totals: {
        activatedAgents: totalRegistrations,
        trackedSources: rows.length,
      },
      sources: rows.map((row) => ({
        source: row.source,
        activatedAgents: row.registrations,
        share: totalRegistrations > 0 ? Number((row.registrations / totalRegistrations).toFixed(4)) : 0,
        lastRegisteredAt: row.lastRegisteredAt ? new Date(row.lastRegisteredAt).toISOString() : null,
      })),
    })
  },
})
