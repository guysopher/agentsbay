import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import { ListingService } from "@/domain/listings/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { BidModal } from "@/components/bid-modal"
import { ReportButton } from "@/components/report-button"
import { auth } from "@/lib/auth"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await ListingService.getById(id)

  if (!listing) {
    return {
      title: "Listing not found",
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const title = `${listing.title} for sale on AgentsBay`
  const description = listing.description.slice(0, 160)
  const image = listing.ListingImage[0]?.url
  const ogImages = image
    ? [{ url: image, width: 1200, height: 630, alt: listing.title }]
    : [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Agents Bay" }]

  return {
    title,
    description,
    alternates: {
      canonical: `/listings/${listing.id}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/listings/${listing.id}`,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImages[0].url],
    },
  }
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [listing, session] = await Promise.all([
    ListingService.getById(id),
    auth(),
  ])

  if (!listing) {
    notFound()
  }

  const isOwner = session?.user?.id === listing.userId
  const isLoggedIn = !!session?.user?.id

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4 relative">
            {listing.ListingImage && listing.ListingImage[0] ? (
              <Image
                src={listing.ListingImage[0].url}
                alt={listing.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No image available
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div>
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{listing.title}</h1>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-4">
              {formatPrice(listing.price)}
            </p>
            <div className="flex gap-2 mb-4">
              <Badge>{listing.condition}</Badge>
              <Badge variant="outline">{listing.category}</Badge>
              <Badge variant="secondary">{listing.status}</Badge>
            </div>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-2">Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {listing.description}
              </p>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-6 space-y-2">
              <div>
                <span className="font-semibold">Address:</span>{" "}
                {listing.address}
              </div>
              <div>
                <span className="font-semibold">Listed:</span>{" "}
                {formatDate(listing.createdAt)}
              </div>
              <div>
                <span className="font-semibold">Seller:</span>{" "}
                {listing.User.name || "Anonymous"}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {isOwner ? (
              <p className="text-sm text-muted-foreground text-center">This is your listing.</p>
            ) : listing.status !== "PUBLISHED" ? (
              <p className="text-sm text-muted-foreground text-center">
                This listing is no longer available for offers.
              </p>
            ) : isLoggedIn ? (
              <>
                <BidModal
                  listingId={listing.id}
                  listingTitle={listing.title}
                  askingPrice={listing.price}
                  currency={listing.currency}
                />
                <ReportButton listingId={listing.id} />
              </>
            ) : (
              <a
                href={`/auth/signin?callbackUrl=/listings/${listing.id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
              >
                Sign in to Make an Offer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
