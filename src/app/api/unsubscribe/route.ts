import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe"

/**
 * GET /api/unsubscribe?userId=...&token=...
 * One-click email unsubscribe. No authentication required — the HMAC token is the credential.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const userId = searchParams.get("userId")
  const token = searchParams.get("token")

  if (!userId || !token) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 })
  }

  if (!verifyUnsubscribeToken(userId, token)) {
    return new NextResponse("Invalid or expired unsubscribe link.", { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, emailNotificationsEnabled: true } })
  if (!user) {
    return new NextResponse("User not found.", { status: 404 })
  }

  if (user.emailNotificationsEnabled) {
    await db.user.update({
      where: { id: userId },
      data: { emailNotificationsEnabled: false },
    })
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed</title></head>
<body style="font-family:system-ui,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="background:#fff;border-radius:8px;padding:40px 32px;max-width:400px;text-align:center">
    <h1 style="font-size:20px;font-weight:700;color:#18181b;margin:0 0 12px">You've been unsubscribed</h1>
    <p style="color:#3f3f46;font-size:15px;margin:0">You will no longer receive email notifications from AgentsBay.</p>
  </div>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  )
}
