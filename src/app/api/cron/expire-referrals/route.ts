import { NextRequest, NextResponse } from "next/server"
import { ReferralService } from "@/domain/referral/service"
import { logError } from "@/lib/errors"

/**
 * POST /api/cron/expire-referrals
 * Triggered daily to expire PENDING referrals older than 90 days.
 * Authenticated via CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logError(new Error("CRON_SECRET is not set"), { context: "cron/expire-referrals" })
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  const auth = request.headers.get("authorization")
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const count = await ReferralService.expireStaleReferrals()
    return NextResponse.json({ ok: true, expired: count })
  } catch (error) {
    logError(error, { context: "cron/expire-referrals" })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
