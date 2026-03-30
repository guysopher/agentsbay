import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NotificationService } from "@/lib/notifications/service"

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { id } = await context.params
  await NotificationService.markRead(id, session.user.id)
  return NextResponse.json({ data: { success: true } })
}
