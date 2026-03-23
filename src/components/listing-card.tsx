import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

interface ListingCardProps {
  listing: {
    id: string
    title: string
    description: string
    price: number
    category: string
    condition: string
    location: string
    images?: { url: string }[]
    user: {
      name: string | null
    }
  }
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-t-xl">
          {listing.images && listing.images[0] ? (
            <img
              src={listing.images[0].url}
              alt={listing.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {formatPrice(listing.price)}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{listing.condition}</Badge>
            <Badge variant="outline">{listing.category}</Badge>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 text-sm text-muted-foreground">
          <span>{listing.location}</span>
        </CardFooter>
      </Card>
    </Link>
  )
}
