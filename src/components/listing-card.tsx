"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/formatting"
import { formatDistance } from "@/lib/geo"
import { showToast } from "@/components/ui/toast"
import { Bot, Copy, MessageSquare, MapPin } from "lucide-react"

interface ListingCardProps {
  listing: {
    id: string
    title: string
    description: string
    price: number
    priceFormatted?: string
    category: string
    condition: string
    address: string
    confidence?: number | null
    agentId?: string | null
    matchScore?: number
    ListingImage?: { url: string }[]
  }
  distanceKm?: number
  showAgentFeatures?: boolean
}

export function ListingCard({ listing, distanceKm, showAgentFeatures = true }: ListingCardProps) {
  const isAgentCreated = !!listing.agentId

  const handleCopyReference = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const reference = `#${listing.id}`
    navigator.clipboard.writeText(reference)
    showToast(`Copied reference: ${reference}`, "success")
  }

  const handleAskAgent = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

    // Create a complete prompt for the user's own AI agent
    const prompt = `I found this item on AgentBay:

Title: ${listing.title}
Price: ${formatPrice(listing.price)}
Category: ${listing.category}
Condition: ${listing.condition}
Address: ${listing.address}
${listing.confidence ? `AI Confidence: ${Math.round(listing.confidence * 100)}%` : ''}
Listing ID: #${listing.id}

Please analyze this listing:
1. Is this a good deal compared to market prices?
2. Should I bid on it? If so, what's a fair offer?
3. Are there any red flags I should know about?

You can access the full details via the AgentBay API:
GET ${baseUrl}/api/agent/listings/${listing.id}

    If it's worth pursuing, ask your agent to proceed with negotiation and then handle fulfillment using:
GET ${baseUrl}/api/agent/orders/{orderId}
POST ${baseUrl}/api/agent/orders/{orderId}/pickup
POST ${baseUrl}/api/agent/orders/{orderId}/closeout`

    navigator.clipboard.writeText(prompt)
    showToast("Prompt copied! Paste it into your AI agent (ChatGPT, Claude, etc.)", "success")
  }

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/listings/${listing.id}`} className="flex-1">
        <div className="aspect-square bg-gray-100 relative overflow-hidden rounded-t-xl">
          {listing.ListingImage && listing.ListingImage[0] ? (
            <Image
              src={listing.ListingImage[0].url}
              alt={listing.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image
            </div>
          )}

          {/* Agent Badge */}
          {isAgentCreated && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-blue-600 text-white border-blue-500">
                <Bot className="h-3 w-3 mr-1" aria-hidden="true" />
                Agent
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {listing.title}
          </h3>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            {listing.priceFormatted || formatPrice(listing.price)}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{listing.condition}</Badge>
            <Badge variant="outline">{listing.category}</Badge>
            {listing.confidence && (
              <Badge variant="outline" className="text-xs">
                {Math.round(listing.confidence * 100)}% confidence
              </Badge>
            )}
            {listing.matchScore !== undefined && listing.matchScore < 1 && (
              <Badge
                variant="outline"
                className={
                  listing.matchScore >= 0.80
                    ? "text-xs border-green-400 text-green-700 bg-green-50"
                    : listing.matchScore >= 0.50
                    ? "text-xs border-yellow-400 text-yellow-700 bg-yellow-50"
                    : "text-xs border-orange-400 text-orange-700 bg-orange-50"
                }
              >
                {listing.matchScore >= 0.80
                  ? "Strong match"
                  : listing.matchScore >= 0.50
                  ? "Partial match"
                  : "Weak match"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{listing.address}</span>
          {distanceKm !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {formatDistance(distanceKm)}
            </Badge>
          )}
        </div>

        {/* Agent-First Actions */}
        {showAgentFeatures && (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleCopyReference}
            >
              <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
              Copy Ref
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleAskAgent}
            >
              <MessageSquare className="h-3 w-3 mr-1" aria-hidden="true" />
              Ask Agent
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
