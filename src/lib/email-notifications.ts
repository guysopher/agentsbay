/**
 * Transactional email notifications for bid and order state transitions.
 * All functions are fire-and-forget — they never throw; the caller's action always succeeds.
 */
import { sendEmail, buildEmailHtml } from "@/lib/email"
import { getSiteUrl } from "@/lib/site-config"
import { getUnsubscribeUrl } from "@/lib/unsubscribe"

// ---------------------------------------------------------------------------
// Bid notifications
// ---------------------------------------------------------------------------

export async function notifyBidPlaced({
  sellerEmail,
  sellerName,
  sellerUserId,
  buyerName,
  listingTitle,
  listingId,
  amountCents,
}: {
  sellerEmail: string
  sellerName: string | null
  sellerUserId: string
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
    subject: `New bid on "${listingTitle}" — ${formattedAmount}`,
    html: buildEmailHtml({
      heading: "New bid received",
      body: `${greeting}<br><br>${buyer} placed a bid of <strong>${formattedAmount}</strong> on your listing <strong>${listingTitle}</strong>.`,
      ctaLabel: "View bid",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
      unsubscribeUrl: getUnsubscribeUrl(sellerUserId),
    }),
  })
}

export async function notifyBidAccepted({
  buyerEmail,
  buyerName,
  buyerUserId,
  listingTitle,
  listingId,
  orderId,
  amountCents,
}: {
  buyerEmail: string
  buyerName: string | null
  buyerUserId: string
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
    subject: `Your bid was accepted — ${formattedAmount}`,
    html: buildEmailHtml({
      heading: "Bid accepted!",
      body: `${greeting}<br><br>Great news — the seller has accepted your bid of <strong>${formattedAmount}</strong> for <strong>${listingTitle}</strong>. Complete your purchase to secure the item.`,
      ctaLabel: "Complete purchase",
      ctaUrl: `${baseUrl}/orders/${orderId}`,
      unsubscribeUrl: getUnsubscribeUrl(buyerUserId),
    }),
  })
}

export async function notifyBidRejected({
  buyerEmail,
  buyerName,
  buyerUserId,
  listingTitle,
  listingId,
}: {
  buyerEmail: string
  buyerName: string | null
  buyerUserId: string
  listingTitle: string
  listingId: string
}) {
  const baseUrl = getSiteUrl()
  const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"

  await sendEmail({
    to: buyerEmail,
    subject: `Your bid on "${listingTitle}" was rejected`,
    html: buildEmailHtml({
      heading: "Bid rejected",
      body: `${greeting}<br><br>The seller has rejected your bid on <strong>${listingTitle}</strong>. The item is still listed — you can place a new bid if you're still interested.`,
      ctaLabel: "View listing",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
      unsubscribeUrl: getUnsubscribeUrl(buyerUserId),
    }),
  })
}

export async function notifyBidCountered({
  recipientEmail,
  recipientName,
  recipientUserId,
  counterpartyName,
  listingTitle,
  listingId,
  amountCents,
}: {
  recipientEmail: string
  recipientName: string | null
  recipientUserId: string
  counterpartyName: string | null
  listingTitle: string
  listingId: string
  amountCents: number
}) {
  const baseUrl = getSiteUrl()
  const formattedAmount = formatAmount(amountCents)
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,"
  const counterparty = counterpartyName ?? "The other party"

  await sendEmail({
    to: recipientEmail,
    subject: `${counterparty} countered your bid — ${formattedAmount}`,
    html: buildEmailHtml({
      heading: "Counter-offer received",
      body: `${greeting}<br><br>You have received a counter-offer of <strong>${formattedAmount}</strong> on <strong>${listingTitle}</strong>. Accept, decline, or make a counter-offer of your own.`,
      ctaLabel: "Respond to offer",
      ctaUrl: `${baseUrl}/listings/${listingId}`,
      unsubscribeUrl: getUnsubscribeUrl(recipientUserId),
    }),
  })
}

// ---------------------------------------------------------------------------
// Order notifications
// ---------------------------------------------------------------------------

export async function notifyOrderCreated({
  buyerEmail,
  buyerName,
  buyerUserId,
  buyerOptedIn = true,
  sellerEmail,
  sellerName,
  sellerUserId,
  sellerOptedIn = true,
  listingTitle,
  orderId,
}: {
  buyerEmail: string
  buyerName: string | null
  buyerUserId: string
  buyerOptedIn?: boolean
  sellerEmail: string
  sellerName: string | null
  sellerUserId: string
  sellerOptedIn?: boolean
  listingTitle: string
  orderId: string
}) {
  const baseUrl = getSiteUrl()
  const sends: Promise<void>[] = []

  if (buyerOptedIn) {
    const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"
    sends.push(sendEmail({
      to: buyerEmail,
      subject: `Order confirmed: ${listingTitle}`,
      html: buildEmailHtml({
        heading: "Order confirmed",
        body: `${greeting}<br><br>Your order for <strong>${listingTitle}</strong> is confirmed. The seller will be in touch to arrange handoff.`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
        unsubscribeUrl: getUnsubscribeUrl(buyerUserId),
      }),
    }))
  }

  if (sellerOptedIn) {
    const greeting = sellerName ? `Hi ${sellerName},` : "Hi there,"
    sends.push(sendEmail({
      to: sellerEmail,
      subject: `Order confirmed: ${listingTitle}`,
      html: buildEmailHtml({
        heading: "Order confirmed",
        body: `${greeting}<br><br>You have a confirmed order for <strong>${listingTitle}</strong>. Please arrange handoff with the buyer.`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
        unsubscribeUrl: getUnsubscribeUrl(sellerUserId),
      }),
    }))
  }

  await Promise.all(sends)
}

export async function notifyOrderInTransit({
  buyerEmail,
  buyerName,
  buyerUserId,
  listingTitle,
  orderId,
}: {
  buyerEmail: string
  buyerName: string | null
  buyerUserId: string
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
      unsubscribeUrl: getUnsubscribeUrl(buyerUserId),
    }),
  })
}

export async function notifyOrderCompleted({
  buyerEmail,
  buyerName,
  buyerUserId,
  buyerOptedIn = true,
  sellerEmail,
  sellerName,
  sellerUserId,
  sellerOptedIn = true,
  listingTitle,
  orderId,
}: {
  buyerEmail: string
  buyerName: string | null
  buyerUserId: string
  buyerOptedIn?: boolean
  sellerEmail: string
  sellerName: string | null
  sellerUserId: string
  sellerOptedIn?: boolean
  listingTitle: string
  orderId: string
}) {
  const baseUrl = getSiteUrl()
  const sends: Promise<void>[] = []

  if (buyerOptedIn) {
    const greeting = buyerName ? `Hi ${buyerName},` : "Hi there,"
    sends.push(sendEmail({
      to: buyerEmail,
      subject: "Transaction complete — how did it go?",
      html: buildEmailHtml({
        heading: "Transaction complete",
        body: `${greeting}<br><br>Your order for <strong>${listingTitle}</strong> has been completed. We hope it went smoothly!`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
        unsubscribeUrl: getUnsubscribeUrl(buyerUserId),
      }),
    }))
  }

  if (sellerOptedIn) {
    const greeting = sellerName ? `Hi ${sellerName},` : "Hi there,"
    sends.push(sendEmail({
      to: sellerEmail,
      subject: "Transaction complete — how did it go?",
      html: buildEmailHtml({
        heading: "Transaction complete",
        body: `${greeting}<br><br>Your sale of <strong>${listingTitle}</strong> has been completed. Thanks for selling on AgentsBay!`,
        ctaLabel: "View order",
        ctaUrl: `${baseUrl}/orders/${orderId}`,
        unsubscribeUrl: getUnsubscribeUrl(sellerUserId),
      }),
    }))
  }

  await Promise.all(sends)
}

// ---------------------------------------------------------------------------
// Message notifications
// ---------------------------------------------------------------------------

export async function notifyNewMessage({
  recipientEmail,
  recipientName,
  recipientUserId,
  senderName,
  listingTitle,
  threadId,
}: {
  recipientEmail: string
  recipientName: string | null
  recipientUserId: string
  senderName: string | null
  listingTitle: string
  threadId: string
}) {
  const baseUrl = getSiteUrl()
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi there,"
  const sender = senderName ?? "Someone"

  await sendEmail({
    to: recipientEmail,
    subject: `New message about "${listingTitle}"`,
    html: buildEmailHtml({
      heading: "New message",
      body: `${greeting}<br><br>${sender} sent you a message about <strong>${listingTitle}</strong>.`,
      ctaLabel: "View message",
      ctaUrl: `${baseUrl}/negotiations/${threadId}`,
      unsubscribeUrl: getUnsubscribeUrl(recipientUserId),
    }),
  })
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
