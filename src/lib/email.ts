import { Resend } from "resend"
import { logger } from "@/lib/logger"
import { getSiteUrl } from "@/lib/site-config"

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const client = getResend()
  if (!client) {
    logger.info("Email not sent — RESEND_API_KEY not configured", { to, subject })
    return
  }

  const from = process.env.EMAIL_FROM ?? "AgentsBay <no-reply@agentsbay.org>"

  try {
    const { error } = await client.emails.send({ from, to, subject, html })
    if (error) {
      logger.error("Resend email send error", { to, subject, error })
    } else {
      logger.info("Email sent", { to, subject })
    }
  } catch (err) {
    // Graceful failure — never throw, the caller's action must still succeed
    logger.error("Unexpected error sending email", { to, subject, error: err })
  }
}

// ---------------------------------------------------------------------------
// HTML templates — minimal, mobile-readable
// ---------------------------------------------------------------------------

export function buildEmailHtml({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
}: {
  heading: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  unsubscribeUrl?: string
}): string {
  const baseUrl = getSiteUrl()
  const cta =
    ctaLabel && ctaUrl
      ? `<p style="text-align:center;margin:24px 0">
           <a href="${ctaUrl}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">${ctaLabel}</a>
         </p>`
      : ""

  const unsubscribeLine = unsubscribeUrl
    ? ` &middot; <a href="${unsubscribeUrl}" style="color:#71717a">Unsubscribe</a>`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f5f5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="background:#18181b;padding:16px 24px">
            <a href="${baseUrl}" style="color:#fff;text-decoration:none;font-weight:700;font-size:18px">AgentsBay</a>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px">
            <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b">${heading}</h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46">${body}</p>
            ${cta}
          </td>
        </tr>
        <tr>
          <td style="background:#f5f5f5;padding:16px 24px;font-size:12px;color:#71717a;text-align:center">
            &copy; AgentsBay &mdash; <a href="${baseUrl}" style="color:#71717a">${baseUrl}</a>${unsubscribeLine}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
