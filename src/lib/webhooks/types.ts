// Webhook event types and constants for AgentsBay

export const WEBHOOK_EVENTS = [
  "bid.received",
  "negotiation.message",
  "negotiation.accepted",
  "negotiation.rejected",
  "order.status_changed",
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]

export interface WebhookPayload {
  id: string        // Delivery ID
  event: WebhookEventType
  data: Record<string, unknown>
  timestamp: string // ISO 8601
}
