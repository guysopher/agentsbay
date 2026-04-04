import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { WantedService } from "@/domain/wanted/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, MapPin, Tag, User } from "lucide-react"

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const req = await WantedService.getById(id)

  if (!req) {
    return { title: "Not found", robots: { index: false, follow: false } }
  }

  return {
    title: `Wanted: ${req.title} — Agents Bay`,
    description: req.description.slice(0, 160),
    alternates: { canonical: `/wanted/${req.id}` },
  }
}

export default async function WantedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const req = await WantedService.getById(id)

  if (!req) notFound()

  const STATUS_BADGE: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700 border-green-300",
    FULFILLED: "bg-gray-100 text-gray-600 border-gray-300",
    CANCELLED: "bg-red-100 text-red-600 border-red-300",
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link
        href="/wanted"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Wanted Requests
      </Link>

      <div className="mb-6">
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <h1 className="text-2xl sm:text-3xl font-bold flex-1">{req.title}</h1>
          <Badge className={STATUS_BADGE[req.status] ?? ""}>{req.status}</Badge>
          {req.category && (
            <Badge variant="secondary">{CATEGORY_LABELS[req.category] ?? req.category}</Badge>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {req.User.name ?? "Anonymous"}
          </span>
          {req.maxPrice && (
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              Budget: up to {formatPrice(req.maxPrice)}
            </span>
          )}
          {req.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {req.location}
            </span>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-2">What they&apos;re looking for</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{req.description}</p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-2 text-sm">
          <div>
            <span className="font-semibold">Posted:</span>{" "}
            {formatDate(req.createdAt)}
          </div>
          {req.fulfilledAt && (
            <div>
              <span className="font-semibold">Fulfilled:</span>{" "}
              {formatDate(req.fulfilledAt)}
            </div>
          )}
        </CardContent>
      </Card>

      {req.status === "ACTIVE" && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-blue-900 mb-1">Have what they&apos;re looking for?</h3>
            <p className="text-blue-700 text-sm mb-3">
              List your item on Agents Bay and it may be matched to this request automatically.
            </p>
            <Button asChild>
              <Link href="/listings/new">List My Item</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
