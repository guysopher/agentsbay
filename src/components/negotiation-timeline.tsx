"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Check, X, Clock, MessageSquare } from "lucide-react"

interface TimelineEntry {
  type: "bid" | "counter" | "accept" | "reject" | "expire" | "message"
  timestamp: string
  actor: "buyer" | "seller" | "system"
  data: {
    amount?: number
    status?: string
    content?: string
    isAgent?: boolean
    bidId?: string
  }
}

interface NegotiationTimelineProps {
  timeline: TimelineEntry[]
  currentUserId?: string
  buyerId?: string
  sellerId?: string
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof Check; label: string }> = {
  bid: { color: "bg-blue-100 text-blue-800", icon: ArrowUp, label: "Bid" },
  counter: { color: "bg-amber-100 text-amber-800", icon: ArrowDown, label: "Counter" },
  accept: { color: "bg-green-100 text-green-800", icon: Check, label: "Accepted" },
  reject: { color: "bg-red-100 text-red-800", icon: X, label: "Rejected" },
  expire: { color: "bg-gray-100 text-gray-500", icon: Clock, label: "Expired" },
  message: { color: "bg-purple-100 text-purple-800", icon: MessageSquare, label: "Message" },
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NegotiationTimeline({ timeline, currentUserId, buyerId, sellerId }: NegotiationTimelineProps) {
  if (timeline.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No negotiation activity yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Negotiation Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-0">
          {/* Vertical connector line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {timeline.map((entry, i) => {
            const config = STATUS_CONFIG[entry.type] ?? STATUS_CONFIG.message
            const Icon = config.icon

            const actorLabel =
              entry.actor === "buyer"
                ? currentUserId === buyerId
                  ? "You"
                  : "Buyer"
                : entry.actor === "seller"
                  ? currentUserId === sellerId
                    ? "You"
                    : "Seller"
                  : "System"

            return (
              <div key={`${entry.type}-${entry.timestamp}-${i}`} className="relative flex items-start gap-3 pb-4">
                {/* Icon circle */}
                <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background`}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className={config.color}>
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{actorLabel}</span>
                    {entry.data.isAgent && (
                      <Badge variant="outline" className="text-xs">
                        Agent
                      </Badge>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  {entry.data.amount != null && (
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {formatCents(entry.data.amount)}
                    </p>
                  )}

                  {entry.data.content && (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.data.content}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
