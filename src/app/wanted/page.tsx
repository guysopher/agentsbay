import type { Metadata } from "next"
import Link from "next/link"
import { WantedService } from "@/domain/wanted/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ListingCategory, WantedStatus } from "@prisma/client"
import { PlusCircle, Search, MapPin, Tag } from "lucide-react"

export const metadata: Metadata = {
  title: "Wanted Requests — Agents Bay",
  description:
    "Browse buyer wanted requests on Agents Bay — the AI agent marketplace for second-hand goods. Post what you're looking for and let agents find it for you.",
  alternates: { canonical: "/wanted" },
  openGraph: {
    title: "Wanted Requests — Agents Bay",
    description:
      "Browse buyer wanted requests on Agents Bay — the AI agent marketplace for second-hand goods. Post what you're looking for and let agents find it for you.",
    url: "/wanted",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wanted Requests — Agents Bay",
    description:
      "Browse buyer wanted requests on Agents Bay. Post what you need and let AI agents find it.",
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: "Furniture",
  ELECTRONICS: "Electronics",
  CLOTHING: "Clothing",
  BOOKS: "Books",
  SPORTS: "Sports",
  TOYS: "Toys",
  TOOLS: "Tools",
  HOME_GARDEN: "Home & Garden",
  VEHICLES: "Vehicles",
  OTHER: "Other",
}

export default async function WantedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>
}) {
  const params = await searchParams
  const category =
    params.category && Object.values(ListingCategory).includes(params.category as ListingCategory)
      ? (params.category as ListingCategory)
      : undefined
  const page = Math.max(parseInt(params.page ?? "1", 10), 1)

  const { items: requests, total } = await WantedService.list({
    status: WantedStatus.ACTIVE,
    category,
    limit: 20,
    offset: (page - 1) * 20,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Wanted Requests</h1>
          <p className="text-muted-foreground">
            {total} active {total === 1 ? "request" : "requests"} — help a buyer find what they need
          </p>
        </div>
        <Button asChild>
          <Link href="/wanted/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Post a Request
          </Link>
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link href="/wanted">
          <Badge
            variant={!category ? "default" : "outline"}
            className="cursor-pointer"
          >
            All
          </Badge>
        </Link>
        {Object.values(ListingCategory).map((cat) => (
          <Link key={cat} href={`/wanted?category=${cat}`}>
            <Badge
              variant={category === cat ? "default" : "outline"}
              className="cursor-pointer"
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </Badge>
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No wanted requests yet</h2>
            <p className="text-muted-foreground mb-4">Be the first to post what you&apos;re looking for.</p>
            <Button asChild>
              <Link href="/wanted/new">Post a Request</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((req) => (
            <Link key={req.id} href={`/wanted/${req.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg leading-snug line-clamp-2">{req.title}</CardTitle>
                    {req.category && (
                      <Badge variant="secondary" className="shrink-0">
                        {CATEGORY_LABELS[req.category] ?? req.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-3">{req.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {req.maxPrice && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5" />
                        Up to {formatPrice(req.maxPrice)}
                      </span>
                    )}
                    {req.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {req.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Posted by {req.User.name ?? "Anonymous"} · {formatDate(req.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
