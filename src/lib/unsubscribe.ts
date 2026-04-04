import { createHmac, timingSafeEqual } from "crypto"
import { getSiteUrl } from "@/lib/site-config"

function secret(): string {
  return process.env.UNSUBSCRIBE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-unsubscribe-secret"
}

export function generateUnsubscribeToken(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("base64url")
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId)
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token))
  } catch {
    return false
  }
}

export function getUnsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId)
  return `${getSiteUrl()}/api/unsubscribe?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
}
