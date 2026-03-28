import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ bidId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { bidId } = await context.params

  try {
    const result = await NegotiationService.rejectBid(bidId, session.user.id)
    return NextResponse.json({ data: { bidId: result.id, status: result.status } })
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404
        : error.message.includes("authorized") ? 403
        : 400
      return NextResponse.json({ error: { message: error.message } }, { status })
    }
    return NextResponse.json({ error: { message: "Failed to reject bid" } }, { status: 500 })
  }
}
