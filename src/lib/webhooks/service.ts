import { db } from "@/lib/db"
import { randomBytes, randomUUID } from "crypto"
import { WEBHOOK_EVENTS, WebhookEventType } from "./types"
import { ValidationError, NotFoundError } from "@/lib/errors"

const MAX_WEBHOOKS_PER_AGENT = 5

export interface CreateWebhookInput {
  url: string
  events: string[]
}

export interface WebhookRecord {
  id: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: Date
}

export interface WebhookCreatedRecord extends WebhookRecord {
  secret: string
}

// Allow HTTP for localhost/127.0.0.1 in dev, require HTTPS otherwise
function isValidWebhookUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"
  if (isLocalhost) return true
  return parsed.protocol === "https:"
}

function isPrivateIp(hostname: string): boolean {
  // Block internal IPs to prevent SSRF (allow localhost explicitly for dev)
  return (
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  )
}

function validateWebhookUrl(url: string): void {
  if (!isValidWebhookUrl(url)) {
    throw new ValidationError("Webhook URL must use HTTPS (HTTP allowed for localhost only)")
  }
  try {
    const parsed = new URL(url)
    if (isPrivateIp(parsed.hostname)) {
      throw new ValidationError("Webhook URL must not target private/internal IP addresses")
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err
    throw new ValidationError("Invalid webhook URL")
  }
}

function validateEvents(events: string[]): WebhookEventType[] {
  if (!events || events.length === 0) {
    throw new ValidationError("At least one event type is required")
  }
  const invalid = events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e))
  if (invalid.length > 0) {
    throw new ValidationError(
      `Invalid event types: ${invalid.join(", ")}. Allowed: ${WEBHOOK_EVENTS.join(", ")}`
    )
  }
  return events as WebhookEventType[]
}

export class WebhookService {
  static async create(agentId: string, input: CreateWebhookInput): Promise<WebhookCreatedRecord> {
    validateWebhookUrl(input.url)
    validateEvents(input.events)

    const count = await db.webhook.count({ where: { agentId, isActive: true } })
    if (count >= MAX_WEBHOOKS_PER_AGENT) {
      throw new ValidationError(`Maximum ${MAX_WEBHOOKS_PER_AGENT} webhooks allowed per agent`)
    }

    const secret = randomBytes(32).toString("hex")
    const now = new Date()

    const webhook = await db.webhook.create({
      data: {
        id: randomUUID(),
        agentId,
        url: input.url,
        events: input.events,
        secret,
        isActive: true,
        updatedAt: now,
      },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
    })

    return { ...webhook, secret }
  }

  static async list(agentId: string): Promise<WebhookRecord[]> {
    return db.webhook.findMany({
      where: { agentId, isActive: true },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })
  }

  static async delete(webhookId: string, agentId: string): Promise<void> {
    const webhook = await db.webhook.findFirst({
      where: { id: webhookId, agentId },
    })
    if (!webhook) {
      throw new NotFoundError("Webhook")
    }
    await db.webhook.delete({ where: { id: webhookId } })
  }
}
