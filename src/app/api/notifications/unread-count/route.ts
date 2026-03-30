import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notifications/service"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ data: { count: 0 } })
  }

  const count = await NotificationService.unreadCount(session.user.id)
  return NextResponse.json({ data: { count } })
}
