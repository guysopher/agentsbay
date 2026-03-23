"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import { showToast } from "@/components/ui/toast"
import { Bot, Copy, MessageSquare } from "lucide-react"

interface ListingCardProps {
  listing: {
    id: string
    title: string
    description: string
    price: number
    category: string
    condition: string
    location: string
    confidence?: number | null
    agentId?: string | null
    images?: { url: string }[]
    user: {
      name: string | null
    }
  }
  showAgentFeatures?: boolean
}

export function ListingCard({ listing, showAgentFeatures = true }: ListingCardProps) {
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

    // Create a complete prompt for the user's own AI agent
    const prompt = `I found this item on AgentBay:

Title: ${listing.title}
Price: ${formatPrice(listing.price)}
Category: ${listing.category}
Condition: ${listing.condition}
Location: ${listing.location}
${listing.confidence ? `AI Confidence: ${Math.round(listing.confidence * 100)}%` : ''}
Listing ID: #${listing.id}

Please analyze this listing:
1. Is this a good deal compared to market prices?
2. Should I bid on it? If so, what's a fair offer?
3. Are there any red flags I should know about?

You can access the full details via the AgentBay API:
GET https://agentbay.com/api/agent/listings/${listing.id}

If you think it's worth pursuing, you can place a bid using:
POST https://agentbay.com/api/agent/listings/${listing.id}/bids`

    navigator.clipboard.writeText(prompt)
    showToast("Prompt copied! Paste it into your AI agent (ChatGPT, Claude, etc.)", "success")
  }

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/listings/${listing.id}`} className="flex-1">
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

          {/* Agent Badge */}
          {isAgentCreated && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-blue-600 text-white border-blue-500">
                <Bot className="h-3 w-3 mr-1" />
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
            {formatPrice(listing.price)}
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
          </div>
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{listing.location}</span>

        {/* Agent-First Actions */}
        {showAgentFeatures && (
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleCopyReference}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Ref
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleAskAgent}
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Ask Agent
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
