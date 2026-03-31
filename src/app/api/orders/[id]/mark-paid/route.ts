import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const order = await OrderService.markAsPaid(id, session.user.id)
    return NextResponse.json({ data: { id: order.id, status: order.status } })
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
    return NextResponse.json({ error: { message: "Failed to mark order as paid" } }, { status: 500 })
  }
}
