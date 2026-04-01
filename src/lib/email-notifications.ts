/**
 * Transactional email notifications for bid and order state transitions.
 * All functions are fire-and-forget — they never throw; the caller's action always succeeds.
 */
import { sendEmail, buildEmailHtml } from "@/lib/email"
import { getSiteUrl } from "@/lib/site-config"

// ---------------------------------------------------------------------------
// Bid notifications
// ---------------------------------------------------------------------------

export async function notifyBidPlaced({
  sellerEmail,
  sellerName,
  buyerName,
  listingTitle,
  listingId,
  amountCents,
}: {
  sellerEmail: string
  sellerName: string | null
  buyerName: string | null
  listingTitle: string
  listingId: string
  amountCents: number
}) {
  const baseUrl = getSiteUrl()
  const formattedAmount = formatAmount(amountCents)
  const greeting = sellerName ? `Hi ${sellerName},` : "Hi there,"
  const buyer = buyerName ?? "A buyer"

  await sendEmail({
    to: sellerEmail,
    subject: `You have a new bid on "${listingTitle}"`,
    html: buildEmailHtml({
      heading: "New bid received",
      body: `${greeting}<br><br>${buyer} placed a bid of <strong>${formattedAmount}</strong> on your listing <strong>${listingTitle}</strong>.`,
      ctaLabel: "View bid",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
    }),
  })
}

export async function notifyBidAccepted({
  buyerEmail,
  buyerName,
  listingTitle,
  listingId,
  orderId,
  amountCents,
}: {
  buyerEmail: string
  buyerName: string | null
  listingTitle: string
  listingId: string
  orderId: string
  amountCents: number
}) {
  const baseUrl = getSiteUrl()
  const formattedAmount = formatAmount(amountCents)
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"

  await sendEmail({
    to: buyerEmail,
    subject: `Your bid was accepted — complete your purchase`,
    html: buildEmailHtml({
      heading: "Bid accepted!",
      body: `${greeting}<br><br>Great news — the seller has accepted your bid of <strong>${formattedAmount}</strong> for <strong>${listingTitle}</strong>. Complete your purchase to secure the item.`,
      ctaLabel: "Complete purchase",
      ctaUrl: `${baseUrl}/orders/${orderId}`,
    }),
  })
}

export async function notifyBidRejected({
  buyerEmail,
  buyerName,
  listingTitle,
  listingId,
}: {
  buyerEmail: string
  buyerName: string | null
  listingTitle: string
  listingId: string
}) {
  const baseUrl = getSiteUrl()
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"

  await sendEmail({
    to: buyerEmail,
    subject: `Your bid on "${listingTitle}" was declined`,
    html: buildEmailHtml({
      heading: "Bid declined",
      body: `${greeting}<br><br>The seller has declined your bid on <strong>${listingTitle}</strong>. The item is still listed — you can place a new bid if you're still interested.`,
      ctaLabel: "View listing",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
    }),
  })
}

export async function notifyBidCountered({
  recipientEmail,
  recipientName,
  listingTitle,
  listingId,
  amountCents,
}: {
  recipientEmail: string
  recipientName: string | null
  listingTitle: string
  listingId: string
  amountCents: number
}) {
  const baseUrl = getSiteUrl()
  const formattedAmount = formatAmount(amountCents)
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,"

  await sendEmail({
    to: recipientEmail,
    subject: `New counter-offer on "${listingTitle}"`,
    html: buildEmailHtml({
      heading: "Counter-offer received",
      body: `${greeting}<br><br>You have received a counter-offer of <strong>${formattedAmount}</strong> on <strong>${listingTitle}</strong>. Accept, decline, or make a counter-offer of your own.`,
      ctaLabel: "Respond to offer",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
    }),
  })
}

// ---------------------------------------------------------------------------
// Order notifications
// ---------------------------------------------------------------------------

export async function notifyOrderInTransit({
  buyerEmail,
  buyerName,
  listingTitle,
  orderId,
}: {
  buyerEmail: string
  buyerName: string | null
  listingTitle: string
  orderId: string
}) {
  const baseUrl = getSiteUrl()
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"

  await sendEmail({
    to: buyerEmail,
    subject: "Your item is on its way!",
    html: buildEmailHtml({
      heading: "Your item is on its way!",
      body: `${greeting}<br><br>The seller has scheduled pickup/delivery for <strong>${listingTitle}</strong>. Check your order for the latest details.`,
      ctaLabel: "View order",
      ctaUrl: `${baseUrl}/orders/${orderId}`,
    }),
  })
}

export async function notifyOrderCompleted({
  buyerEmail,
  buyerName,
  sellerEmail,
  sellerName,
  listingTitle,
  orderId,
}: {
  buyerEmail: string
  buyerName: string | null
  sellerEmail: string
  sellerName: string | null
  listingTitle: string
  orderId: string
}) {
  const baseUrl = getSiteUrl()

  const buyerGreeting = buyerName ? `Hi ${buyerName},` : "Hi there,"
  const sellerGreeting = sellerName ? `Hi ${sellerName},` : "Hi there,"

  await Promise.all([
    sendEmail({
      to: buyerEmail,
      subject: "Transaction complete — how did it go?",
      html: buildEmailHtml({
        heading: "Transaction complete",
        body: `${buyerGreeting}<br><br>Your order for <strong>${listingTitle}</strong> has been completed. We hope it went smoothly!`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
      }),
    }),
    sendEmail({
      to: sellerEmail,
      subject: "Transaction complete — how did it go?",
      html: buildEmailHtml({
        heading: "Transaction complete",
        body: `${sellerGreeting}<br><br>Your sale of <strong>${listingTitle}</strong> has been completed. Thanks for selling on AgentsBay!`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
      }),
    }),
  ])
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}
