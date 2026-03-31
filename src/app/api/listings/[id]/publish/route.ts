import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { ListingService } from "@/domain/listings/service"
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
    const listing = await ListingService.publish(id, session.user.id)
    return NextResponse.json({ data: { id: listing.id, status: listing.status } })
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
    return NextResponse.json({ error: { message: "Failed to publish listing" } }, { status: 500 })
  }
}
