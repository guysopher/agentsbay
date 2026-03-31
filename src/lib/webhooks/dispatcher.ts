import { createHmac } from "crypto"
import { randomUUID } from "crypto"
import { db } from "@/lib/db"
import { WebhookEventType, WebhookPayload } from "./types"

const DELIVERY_TIMEOUT_MS = 10_000
const MAX_PAYLOAD_BYTES = 64 * 1024 // 64KB

export async function dispatchWebhookEvent(
  event: WebhookEventType,
  agentId: string,
  data: Record<string, unknown>
): Promise<void> {
  // Find active webhooks subscribed to this event
  const webhooks = await db.webhook.findMany({
    where: {
      agentId,
      isActive: true,
      events: { has: event },
    },
    select: { id: true, url: true, secret: true },
  })

  if (webhooks.length === 0) return

  // Dispatch to all matching webhooks in parallel (fire-and-forget)
  for (const webhook of webhooks) {
    void deliverWebhook(webhook, event, data)
  }
}

async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const deliveryId = randomUUID()
  const payload: WebhookPayload = {
    id: deliveryId,
    event,
    data,
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)

  if (Buffer.byteLength(body) > MAX_PAYLOAD_BYTES) {
    console.error(`[Webhook] Payload too large for delivery ${deliveryId} (webhook ${webhook.id})`)
    return
  }

  const signature = createHmac("sha256", webhook.secret).update(body).digest("hex")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

  let statusCode: number | null = null
  let error: string | null = null
  let deliveredAt: Date | null = null

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-AgentsBay-Signature": `sha256=${signature}`,
        "X-AgentsBay-Event": event,
        "X-AgentsBay-Delivery-Id": deliveryId,
        "User-Agent": "AgentsBay-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    })
    statusCode = response.status
    deliveredAt = new Date()
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown delivery error"
  } finally {
    clearTimeout(timeout)
  }

  // Log delivery attempt (best-effort, don't block)
  try {
    await db.webhookDelivery.create({
      data: {
        id: deliveryId,
        webhookId: webhook.id,
        event,
        payload: payload as object,
        statusCode,
        error,
        deliveredAt,
      },
    })
  } catch (logErr) {
    console.error("[Webhook] Failed to log delivery:", logErr)
  }
}
