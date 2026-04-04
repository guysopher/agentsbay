import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { ReferralService } from "@/domain/referral/service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stats = await ReferralService.getStats(session.user.id)
  return NextResponse.json(stats)
}
