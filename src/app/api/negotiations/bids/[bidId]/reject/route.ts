import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

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
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 })
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 403 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 })
    }
    return NextResponse.json({ error: { message: "Failed to reject bid" } }, { status: 500 })
  }
}
