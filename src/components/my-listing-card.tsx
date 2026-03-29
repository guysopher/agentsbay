import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/formatting"
import { ListingStatus } from "@prisma/client"
import { MessageSquare } from "lucide-react"

const STATUS_LABELS: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  PUBLISHED: "Published",
  PAUSED: "Paused",
  SOLD: "Sold",
  REMOVED: "Removed",
  RESERVED: "Reserved",
  FLAGGED: "Flagged",
  FOR_SALE: "For Sale",
  TENTATIVE: "Tentative",
}

const STATUS_VARIANTS: Record<
  ListingStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "secondary",
  PENDING_REVIEW: "outline",
  PUBLISHED: "default",
  PAUSED: "outline",
  SOLD: "secondary",
  REMOVED: "destructive",
  RESERVED: "outline",
  FLAGGED: "destructive",
  FOR_SALE: "default",
  TENTATIVE: "outline",
}

interface MyListingCardProps {
  listing: {
    id: string
    title: string
    price: number
    currency: string
    priceFormatted: string
    status: ListingStatus
    createdAt: Date
    ListingImage: { url: string }[]
    NegotiationThread: { id: string }[]
  }
}

export function MyListingCard({ listing }: MyListingCardProps) {
  const thumbnail = listing.ListingImage[0]?.url
  const activeNegotiations = listing.NegotiationThread.length

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start gap-4">
            {thumbnail ? (
              <div className="shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted">
                <Image
                  src={thumbnail}
                  alt={listing.title}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="shrink-0 w-16 h-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant={STATUS_VARIANTS[listing.status]}>
                  {STATUS_LABELS[listing.status]}
                </Badge>
                {activeNegotiations > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {activeNegotiations} active
                  </Badge>
                )}
              </div>
              <p className="font-semibold truncate">{listing.title}</p>
              <p className="text-sm text-muted-foreground">{listing.priceFormatted}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{formatDate(listing.createdAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
