import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { z, ZodError } from "zod"

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
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
    const validated = sendMessageSchema.parse(body)

    const result = await NegotiationService.sendMessage(listingId, session.user.id, {
      content: validated.content,
      isAgent: false,
    })

    return NextResponse.json({
      data: {
        threadId: result.thread.id,
        messageId: result.message.id,
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { message: "Validation error", details: error.errors } },
        { status: 400 }
      )
    }
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400
      return NextResponse.json({ error: { message: error.message } }, { status })
    }
    return NextResponse.json({ error: { message: "Failed to send message" } }, { status: 500 })
  }
}
