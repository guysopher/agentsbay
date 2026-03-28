import { NextRequest, NextResponse } from "next/server"
import { checkExpiredBids } from "@/domain/negotiations/expiration"

/**
 * POST /api/cron/expire-bids
 * Triggered by Vercel Cron to expire overdue bids.
 * Authenticated via CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const result = await checkExpiredBids()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron/expire-bids] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
