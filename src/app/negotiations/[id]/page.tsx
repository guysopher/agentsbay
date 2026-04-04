import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NegotiationActions } from "@/components/negotiation-actions"
import { MessageInput } from "@/components/message-input"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Negotiation",
  robots: { index: false, follow: false },
}

const BID_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "default",
  ACCEPTED: "secondary",
  REJECTED: "destructive",
  COUNTERED: "outline",
  EXPIRED: "outline",
}

const BID_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COUNTERED: "Countered",
  EXPIRED: "Expired",
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/negotiations")
  }

  const { id } = await params

  let thread
  try {
    thread = await NegotiationService.getThread(id, userId)
  } catch (err) {
    if (err instanceof Error && (err.message.includes("not found") || err.message.includes("authorized"))) {
      notFound()
    }
    throw err
  }

  const isBuyer = thread.buyerId === userId
  const isActive = thread.status === "ACTIVE"

  // The latest pending bid (if any) — for showing action buttons
  const pendingBid = thread.Bid.find((b) => b.status === "PENDING")

  // Show re-offer CTA when buyer is at a dead end: active thread, no pending bid, buyer has bid before
  const hasBuyerPreviousBid = thread.Bid.some((b) => b.placedByUserId === userId)
  const showReofferCTA = isActive && isBuyer && !pendingBid && hasBuyerPreviousBid

  // Determine if current user should respond (the "ball is in their court")
  // Bids are sorted desc, so thread.Bid[0] is the latest
  // If latest bid has no agentId — it was a human bid. Buyer places first bid, seller counters, etc.
  // Simple heuristic: if latest pending bid was placed by buyer → seller should respond, and vice versa
  const canRespond =
    isActive &&
    pendingBid !== undefined &&
    pendingBid.placedByUserId !== userId

  // Merge bids and messages into a chronological timeline
  const timeline = [
    ...thread.Bid.map((bid) => ({ type: "bid" as const, createdAt: bid.createdAt, data: bid })),
    ...thread.NegotiationMessage.map((msg) => ({
      type: "message" as const,
      createdAt: msg.createdAt,
      data: msg,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/negotiations" className="hover:text-foreground">Negotiations</Link>
        {" / "}
        <span className="text-foreground">{thread.Listing.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{thread.Listing.title}</h1>
            <p className="text-muted-foreground text-sm">
              Asking {formatPrice(thread.Listing.price, thread.Listing.currency)}
              {" · "}
              <Link href={`/listings/${thread.Listing.id}`} className="underline hover:text-foreground">
                View listing
              </Link>
            </p>
          </div>
          <Badge variant={isActive ? "default" : "secondary"}>
            {thread.status}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bid History &amp; Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item) => {
                if (item.type === "bid") {
                  const bid = item.data
                  const isMyBid = bid.placedByUserId === userId
                  return (
                    <div
                      key={`bid-${bid.id}`}
                      className={`flex ${isMyBid ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-sm rounded-lg px-4 py-3 ${
                          isMyBid
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {bid.agentId ? "Agent" : isMyBid ? "You" : isBuyer ? "Seller" : "Buyer"}
                          </span>
                          <Badge
                            variant={BID_STATUS_VARIANTS[bid.status] ?? "outline"}
                            className="text-xs"
                          >
                            {BID_STATUS_LABELS[bid.status] ?? bid.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(bid.createdAt)}
                          </span>
                        </div>
                        <p className="font-bold text-lg">{formatPrice(bid.amount)}</p>
                        {bid.message && (
                          <p className="text-sm text-muted-foreground mt-1">{bid.message}</p>
                        )}
                        {bid.expiresAt && bid.status === "PENDING" && (
                          <p className="text-xs text-amber-600 mt-1">
                            Expires {formatDate(bid.expiresAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                } else {
                  const msg = item.data
                  return (
                    <div key={`msg-${msg.id}`} className="flex justify-start">
                      <div className="max-w-sm rounded-lg px-4 py-3 bg-white border">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {msg.isAgent ? "Agent" : "User"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action area — only when thread is active */}
      {isActive && (
        <div className="space-y-4">
          {canRespond && pendingBid && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3">
                  Respond to offer of {formatPrice(pendingBid.amount)}
                </p>
                <NegotiationActions
                  bidId={pendingBid.id}
                  threadId={thread.id}
                  isSeller={!isBuyer}
                />
              </CardContent>
            </Card>
          )}

          {isActive && pendingBid && pendingBid.placedByUserId === userId && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              Waiting for {isBuyer ? "the seller" : "the buyer"} to respond.
            </div>
          )}

          {showReofferCTA && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900 mb-2">
                Your offer was declined. You can still make a new offer.
              </p>
              <Link
                href={`/listings/${thread.listingId}`}
                className="inline-flex items-center text-sm font-medium text-amber-800 underline hover:text-amber-900"
              >
                Make a New Offer
              </Link>
            </div>
          )}

          <Card>
            <CardContent className="pt-4">
              <MessageInput listingId={thread.listingId} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Closed thread info */}
      {!isActive && thread.closedAt && (
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          This negotiation was closed on {formatDate(thread.closedAt)}.
          {thread.status === "ACCEPTED" && (
            <> Check your <Link href="/orders" className="underline hover:text-foreground">orders</Link> for next steps.</>
          )}
        </div>
      )}
    </div>
  )
}
