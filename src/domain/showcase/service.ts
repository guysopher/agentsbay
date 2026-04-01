import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"

export type ShowcaseSort = "most_active" | "newest" | "highest_rated"

export interface ShowcaseAgent {
  id: string
  name: string | null
  image: string | null
  createdAt: Date
  displayName: string | null
  listingsCount: number
  tradesCompleted: number
  avgRating: number
  reviewCount: number
}

const PAGE_SIZE = 20

export async function getShowcaseAgents(sort: ShowcaseSort = "most_active", page = 0) {
  const offset = page * PAGE_SIZE

  const orderClause =
    sort === "newest"
      ? Prisma.sql`u."createdAt" DESC`
      : sort === "highest_rated"
        ? Prisma.sql`COALESCE(AVG(r.rating), 0) DESC, COUNT(DISTINCT r.id) DESC`
        : Prisma.sql`(COUNT(DISTINCT l.id) + COUNT(DISTINCT o.id)) DESC`

  const rows = await db.$queryRaw<ShowcaseAgent[]>`
    SELECT
      u.id,
      u.name,
      u.image,
      u."createdAt",
      p."displayName",
      CAST(COUNT(DISTINCT l.id) AS INTEGER)   AS "listingsCount",
      CAST(COUNT(DISTINCT o.id) AS INTEGER)   AS "tradesCompleted",
      COALESCE(AVG(r.rating), 0)::float       AS "avgRating",
      CAST(COUNT(DISTINCT r.id) AS INTEGER)   AS "reviewCount"
    FROM "User" u
    LEFT JOIN "Profile" p ON p."userId" = u.id
    LEFT JOIN "Listing" l ON l."userId" = u.id AND l.status != 'REMOVED'
    LEFT JOIN "Order"   o ON o."sellerId" = u.id AND o.status = 'COMPLETED'
    LEFT JOIN "Review"  r ON r."revieweeId" = u.id
    WHERE u.status = 'ACTIVE'
      AND u."isBanned" = false
      AND u."deletedAt" IS NULL
    GROUP BY u.id, u.name, u.image, u."createdAt", p."displayName"
    HAVING COUNT(DISTINCT l.id) >= 1 OR COUNT(DISTINCT o.id) >= 1
    ORDER BY ${orderClause}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `

  const countResult = await db.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count FROM (
      SELECT u.id
      FROM "User" u
      LEFT JOIN "Listing" l ON l."userId" = u.id AND l.status != 'REMOVED'
      LEFT JOIN "Order"   o ON o."sellerId" = u.id AND o.status = 'COMPLETED'
      WHERE u.status = 'ACTIVE'
        AND u."isBanned" = false
        AND u."deletedAt" IS NULL
      GROUP BY u.id
      HAVING COUNT(DISTINCT l.id) >= 1 OR COUNT(DISTINCT o.id) >= 1
    ) AS subq
  `

  const total = Number(countResult[0].count)
  const hasMore = offset + PAGE_SIZE < total
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return { agents: rows, total, hasMore, totalPages, page }
}
