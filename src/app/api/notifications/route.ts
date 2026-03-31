import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notifications/service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)))

  const { notifications, total } = await NotificationService.list(session.user.id, page, pageSize)
  const totalPages = Math.ceil(total / pageSize)

  return NextResponse.json({
    data: notifications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  })
}

export async function PATCH() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  await NotificationService.markAllRead(session.user.id)
  return NextResponse.json({ data: { success: true } })
}
