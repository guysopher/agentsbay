import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { eventBus } from "@/lib/events"
import { OrderStatus, PaymentStatus } from "@prisma/client"
import { randomUUID } from "crypto"
import type Stripe from "stripe"

// Stripe requires the raw request body for signature verification.
// This route must NOT use createApiHandler (which reads body as JSON).
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not set")
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  const sig = req.headers.get("stripe-signature")
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  let event: Stripe.Event
  const body = await req.text()

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    logger.warn("Stripe webhook signature verification failed", { error: message })
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case "charge.dispute.created":
        await handleChargeDisputeCreated(event.data.object as Stripe.Dispute)
        break

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
        logger.info(`Stripe webhook: unhandled event type ${event.type}`)
    }
  } catch (err) {
    logger.error("Stripe webhook handler error", { eventType: event.type, error: err })
    // Return 200 to prevent Stripe from retrying — log the error instead
    return NextResponse.json({ received: true, error: "Handler error" }, { status: 200 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId
  if (!orderId) {
    logger.warn("Stripe checkout.session.completed missing orderId in metadata", {
      sessionId: session.id,
    })
    return
  }

  const now = new Date()

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) {
      logger.warn("Stripe webhook: order not found", { orderId })
      return
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      // Already processed (idempotent)
      logger.info("Stripe webhook: order already processed", { orderId, status: order.status })
      return
    }

    // Upsert a Payment record
    await tx.payment.upsert({
      where: { orderId },
      update: {
        stripePaymentId: session.payment_intent as string | null,
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        orderId,
        stripePaymentId: session.payment_intent as string | null,
        amount: order.amount,
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        updatedAt: now,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, updatedAt: now },
    })

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "order.payment_completed",
        entityType: "order",
        entityId: orderId,
        metadata: { stripeSessionId: session.id },
      },
    })
  })

  // Re-fetch for event emission
  const updated = await db.order.findUnique({ where: { id: orderId } })
  if (updated) {
    void eventBus.emit("order.updated", {
      orderId: updated.id,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
      status: updated.status,
    })
    void eventBus.emit("payment.completed", {
      paymentId: orderId,
      orderId: updated.id,
    })
  }

  logger.info("Stripe checkout.session.completed: order transitioned to PAID", { orderId })
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.orderId
  if (!orderId) {
    logger.warn("Stripe payment_intent.succeeded missing orderId in metadata", {
      paymentIntentId: paymentIntent.id,
    })
    return
  }

  const now = new Date()

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } })
    if (!order) {
      logger.warn("Stripe webhook: order not found for payment_intent.succeeded", { orderId })
      return
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      // Already processed (idempotent)
      logger.info("Stripe payment_intent.succeeded: order already processed", {
        orderId,
        status: order.status,
      })
      return
    }

    await tx.payment.upsert({
      where: { orderId },
      update: {
        stripePaymentId: paymentIntent.id,
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        orderId,
        stripePaymentId: paymentIntent.id,
        amount: order.amount,
        status: PaymentStatus.SUCCEEDED,
        paidAt: now,
        updatedAt: now,
      },
    })

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, updatedAt: now },
    })

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "order.payment_completed",
        entityType: "order",
        entityId: orderId,
        metadata: { stripePaymentIntentId: paymentIntent.id },
      },
    })
  })

  const updated = await db.order.findUnique({ where: { id: orderId } })
  if (updated) {
    void eventBus.emit("order.updated", {
      orderId: updated.id,
      buyerId: updated.buyerId,
      sellerId: updated.sellerId,
      status: updated.status,
    })
    void eventBus.emit("payment.completed", {
      paymentId: orderId,
      orderId: updated.id,
    })
  }

  logger.info("Stripe payment_intent.succeeded: order transitioned to PAID", { orderId })
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.warn("Stripe payment_intent.payment_failed", {
    paymentIntentId: paymentIntent.id,
    lastError: paymentIntent.last_payment_error?.message,
  })

  // Upsert Payment record as FAILED if we can correlate to an order
  const existing = await db.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  })
  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: { status: PaymentStatus.FAILED, updatedAt: new Date() },
    })
  }
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  logger.warn("Stripe charge.dispute.created", { disputeId: dispute.id, chargeId: dispute.charge })

  // Correlate via PaymentIntent → Payment → Order
  const paymentIntentId =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id

  if (!paymentIntentId) {
    logger.warn("Stripe charge.dispute.created: no payment_intent on dispute", {
      disputeId: dispute.id,
    })
    return
  }

  const payment = await db.payment.findFirst({ where: { stripePaymentId: paymentIntentId } })
  if (!payment) {
    logger.warn("Stripe charge.dispute.created: no payment record found", { paymentIntentId })
    return
  }

  const order = await db.order.findUnique({ where: { id: payment.orderId } })
  if (!order) return

  // Idempotent: only transition if not already in a terminal dispute/refund state
  if (order.status === OrderStatus.DISPUTED || order.status === OrderStatus.REFUNDED) {
    logger.info("Stripe charge.dispute.created: order already in terminal state", {
      orderId: order.id,
      status: order.status,
    })
    return
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.DISPUTED, updatedAt: new Date() },
    })
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "order.disputed",
        entityType: "order",
        entityId: order.id,
        metadata: { disputeId: dispute.id, stripePaymentIntentId: paymentIntentId },
      },
    })
  })

  logger.info("Stripe charge.dispute.created: order transitioned to DISPUTED", {
    orderId: order.id,
    disputeId: dispute.id,
  })
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  logger.info("Stripe charge.refunded", { chargeId: charge.id })

  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id

  if (!paymentIntentId) {
    logger.warn("Stripe charge.refunded: no payment_intent on charge", { chargeId: charge.id })
    return
  }

  const payment = await db.payment.findFirst({ where: { stripePaymentId: paymentIntentId } })
  if (!payment) {
    logger.warn("Stripe charge.refunded: no payment record found", { paymentIntentId })
    return
  }

  const now = new Date()

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: payment.orderId } })
    if (!order) return

    // Idempotent guard
    if (order.status === OrderStatus.REFUNDED) {
      logger.info("Stripe charge.refunded: order already REFUNDED", { orderId: order.id })
      return
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.REFUNDED, refundedAt: now, updatedAt: now },
    })

    await tx.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.REFUNDED, updatedAt: now },
    })

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        action: "order.refunded",
        entityType: "order",
        entityId: order.id,
        metadata: { stripeChargeId: charge.id, stripePaymentIntentId: paymentIntentId },
      },
    })
  })

  logger.info("Stripe charge.refunded: order transitioned to REFUNDED", {
    orderId: payment.orderId,
    chargeId: charge.id,
  })
}
