import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z, ZodError } from "zod"

const counterSchema = z.object({
  amount: z.number().int().positive().min(100),
  message: z.string().max(500).optional(),
  expiresIn: z.number().int().positive().max(7 * 24 * 60 * 60).optional(),
})

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bidId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 })
  }

  const { bidId } = await context.params

  try {
    const body = await req.json()
    const validated = counterSchema.parse(body)

    const result = await NegotiationService.counterBid(bidId, session.user.id, validated)
    return NextResponse.json({ data: { bidId: result.id, amount: result.amount, status: result.status } })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { message: "Validation error", details: error.errors } },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404
        : error.message.includes("authorized") ? 403
        : 400
      return NextResponse.json({ error: { message: error.message } }, { status })
    }
    return NextResponse.json({ error: { message: "Failed to counter bid" } }, { status: 500 })
  }
}
