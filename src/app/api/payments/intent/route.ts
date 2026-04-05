import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { OrderStatus, PaymentStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import { z } from "zod"

const intentSchema = z.object({
  orderId: z.string().min(1),
})

export const { POST } = createApiHandler({
  POST: async (req) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) {
      return authResult.response
    }
    const { auth } = authResult

    const buyerId = auth.userId
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse("Invalid JSON body", 400)
    }

    const parsed = intentSchema.safeParse(body)
    if (!parsed.success) return errorResponse("orderId is required", 400)

    const { orderId } = parsed.data

    try {
      const order = await db.order.findFirst({
        where: { id: orderId, buyerId },
        include: {
          Listing: { select: { title: true, currency: true } },
        },
      })

      if (!order) throw new NotFoundError("Order")

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new ValidationError("Order is not awaiting payment")
      }

      const stripe = getStripe()

      // Idempotent: if a PROCESSING payment record with a PaymentIntent already exists,
      // return the existing client secret rather than creating a duplicate.
      const existingPayment = await db.payment.findUnique({ where: { orderId } })
      if (
        existingPayment?.stripePaymentId &&
        existingPayment.status === PaymentStatus.PROCESSING
      ) {
        const existingIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripePaymentId
        )
        if (
          existingIntent.status === "requires_payment_method" ||
          existingIntent.status === "requires_confirmation"
        ) {
          return successResponse({ clientSecret: existingIntent.client_secret })
        }
      }

      const currency = (order.Listing.currency ?? "usd").toLowerCase()

      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.amount,
        currency,
        metadata: { orderId, buyerId, sellerId: order.sellerId },
        automatic_payment_methods: { enabled: true },
      })

      const now = new Date()
      await db.payment.upsert({
        where: { orderId },
        update: {
          stripePaymentId: paymentIntent.id,
          status: PaymentStatus.PROCESSING,
          updatedAt: now,
        },
        create: {
          id: randomUUID(),
          orderId,
          stripePaymentId: paymentIntent.id,
          amount: order.amount,
          status: PaymentStatus.PROCESSING,
          updatedAt: now,
        },
      })

      return successResponse({ clientSecret: paymentIntent.client_secret })
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Order not found", 404)
      if (err instanceof ValidationError) return errorResponse(err.message, 400)
      throw err
    }
  },
})
