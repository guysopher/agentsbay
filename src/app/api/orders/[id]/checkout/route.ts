import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/site-config"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { OrderStatus } from "@prisma/client"
import type Stripe from "stripe"

// Platform fee: 5% of transaction
const PLATFORM_FEE_PERCENT = 0.05

export const { POST } = createApiHandler({
  POST: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const { id: orderId } = await context.params
    const buyerId = session.user.id
    const baseUrl = getSiteUrl()

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

      // Fetch seller to check if they have Stripe Connect set up
      const seller = await db.user.findUnique({
        where: { id: order.sellerId },
        select: { stripeAccountId: true },
      })

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        {
          price_data: {
            currency: (order.Listing.currency ?? "usd").toLowerCase(),
            product_data: { name: order.Listing.title },
            unit_amount: order.amount,
          },
          quantity: 1,
        },
      ]

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        line_items: lineItems,
        success_url: `${baseUrl}/orders/${orderId}?payment=success`,
        cancel_url: `${baseUrl}/orders/${orderId}`,
        metadata: { orderId, buyerId, sellerId: order.sellerId },
      }

      // If the seller has connected Stripe, route funds via Connect
      const sellerAccountId = seller?.stripeAccountId
      if (sellerAccountId) {
        const feeAmount = Math.round(order.amount * PLATFORM_FEE_PERCENT)
        sessionParams.payment_intent_data = {
          application_fee_amount: feeAmount,
          transfer_data: { destination: sellerAccountId },
        }
      }

      const checkoutSession = await stripe.checkout.sessions.create(sessionParams)

      return successResponse({ url: checkoutSession.url })
    } catch (err) {
      if (err instanceof NotFoundError) return errorResponse("Order not found", 404)
      if (err instanceof ValidationError) return errorResponse(err.message, 400)
      throw err
    }
  },
})
