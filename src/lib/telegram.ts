import { env } from "@/lib/env"
import { logger } from "@/lib/logger"

const telegramLogger = logger.child({ subsystem: "telegram" })

export interface TelegramMessage {
  text: string
  chatId?: string
}

export interface CeoHeartbeatReport {
  summary: string
  taskIdentifier?: string
  wakeReason?: string
  runId?: string
  reportedAt?: string
}

interface TelegramApiResponse {
  ok: boolean
  description?: string
}

function getTelegramConfig() {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID ?? env.TELEGRAM_CHAT_ID,
    boardChatId: process.env.TELEGRAM_BOARD_CHAT_ID ?? env.TELEGRAM_BOARD_CHAT_ID,
  }
}

export function isTelegramConfigured(): boolean {
  const { botToken, chatId } = getTelegramConfig()
  return Boolean(botToken && chatId)
}

export function getTelegramBoardChatId(): string | undefined {
  const { boardChatId, chatId } = getTelegramConfig()
  return boardChatId ?? chatId
}

export function buildTelegramNotificationText(
  event: string,
  details: Record<string, string | number | boolean | null | undefined>
): string {
  const lines = ["AgentBay notification", `Event: ${event}`]

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null || value === "") {
      continue
    }

    lines.push(`${key}: ${String(value)}`)
  }

  return lines.join("\n")
}

export function buildCeoHeartbeatReportText({
  summary,
  taskIdentifier,
  wakeReason,
  runId,
  reportedAt,
}: CeoHeartbeatReport): string {
  const lines = ["AgentBay CEO heartbeat", `Summary: ${summary.trim()}`]

  if (taskIdentifier) {
    lines.push(`Task: ${taskIdentifier}`)
  }

  if (wakeReason) {
    lines.push(`Trigger: ${wakeReason}`)
  }

  if (runId) {
    lines.push(`Run: ${runId}`)
  }

  if (reportedAt) {
    lines.push(`Reported at: ${reportedAt}`)
  }

  return lines.join("\n")
}

export async function sendTelegramMessage({
  text,
  chatId,
}: TelegramMessage): Promise<void> {
  const { botToken, chatId: defaultChatId } = getTelegramConfig()
  const resolvedChatId = chatId ?? defaultChatId

  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured")
  }

  if (!resolvedChatId) {
    throw new Error("TELEGRAM_CHAT_ID is not configured")
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: resolvedChatId,
        text,
        disable_web_page_preview: true,
      }),
    }
  )

  const payload = (await response.json()) as TelegramApiResponse

  if (!response.ok || !payload.ok) {
    telegramLogger.error("Telegram send failed", payload, {
      status: response.status,
      chatId: resolvedChatId,
    })
    throw new Error(payload.description || "Telegram send failed")
  }

  telegramLogger.info("Telegram message sent", {
    chatId: resolvedChatId,
    textLength: text.length,
  })
}
