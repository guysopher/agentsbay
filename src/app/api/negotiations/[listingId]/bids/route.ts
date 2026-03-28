import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z, ZodError } from "zod"
import { NotFoundError, ValidationError } from "@/lib/errors"

const placeBidSchema = z.object({
  amount: z.number().int().positive().min(100, "Minimum bid is $1.00"),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().positive().max(7 * 24 * 60 * 60).optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ listingId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { listingId } = await context.params

  try {
    const body = await req.json()
    const validated = placeBidSchema.parse(body)

    const result = await NegotiationService.placeBid({
      listingId,
      buyerId: session.user.id,
      amount: validated.amount,
      message: validated.message,
      expiresIn: validated.expiresIn,
    })

    return NextResponse.json(
      { data: { threadId: result.thread.id, bidId: result.bid.id, status: result.bid.status } },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { message: "Validation error", details: error.errors } },
        { status: 400 }
      )
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 404 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: { message: error.message } }, { status: 400 })
    }
    return NextResponse.json({ error: { message: "Failed to place bid" } }, { status: 500 })
  }
}
