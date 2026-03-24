import { notFound } from "next/navigation"
import Image from "next/image"
import { ListingService } from "@/domain/listings/service"
import { formatPrice, formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const listing = await ListingService.getById(id)

  if (!listing) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
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
            <h1 className="text-4xl font-bold mb-2">{listing.title}</h1>
            <p className="text-3xl font-bold text-blue-600 mb-4">
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
            <Button className="w-full" size="lg">
              Make an Offer
            </Button>
            <Button className="w-full" variant="outline" size="lg">
              Send to My Agent
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
