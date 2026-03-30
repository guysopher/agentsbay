import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { NegotiationService } from "@/domain/negotiations/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ACCEPTED: "secondary",
  REJECTED: "destructive",
  CANCELLED: "outline",
  EXPIRED: "outline",
}

const BID_STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  COUNTERED: "Countered",
  EXPIRED: "Expired",
}

export default async function NegotiationsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/negotiations")
  }

  const { role } = await searchParams
  const validRole = role === "buyer" || role === "seller" ? role : undefined

  const threads = await NegotiationService.listThreads(userId, validRole)

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Negotiations</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/negotiations"
            className={`px-3 py-1.5 rounded-md border transition-colors ${!validRole ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            All
          </Link>
          <Link
            href="/negotiations?role=buyer"
            className={`px-3 py-1.5 rounded-md border transition-colors ${validRole === "buyer" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            Buying
          </Link>
          <Link
            href="/negotiations?role=seller"
            className={`px-3 py-1.5 rounded-md border transition-colors ${validRole === "seller" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            Selling
          </Link>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No negotiations yet.</p>
          <p className="text-sm">
            <Link href="/browse" className="underline hover:text-foreground">Browse listings</Link> to make an offer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => {
            const latestBid = thread.Bid[0]
            const isBuyer = thread.buyerId === userId

            return (
              <Link key={thread.id} href={`/negotiations/${thread.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {isBuyer ? "Buying" : "Selling"}

                          </Badge>
                          <Badge variant={STATUS_VARIANTS[thread.status] ?? "outline"}>
                            {STATUS_LABELS[thread.status] ?? thread.status}
                          </Badge>
                        </div>
                        <p className="font-semibold truncate">{thread.Listing.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Ask: {formatPrice(thread.Listing.price, thread.Listing.currency)}
                          {latestBid && (
                            <> &mdash; {latestBid.status === "PENDING" ? "Offer" : "Last offer"}: {formatPrice(latestBid.amount)}</>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {latestBid && (
                          <Badge variant="secondary" className="text-xs mb-1">
                            {BID_STATUS_LABELS[latestBid.status] ?? latestBid.status}
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(thread.updatedAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
