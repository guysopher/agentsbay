"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatPrice } from "@/lib/formatting"

interface BidModalProps {
  listingId: string
  listingTitle: string
  askingPrice: number
  currency?: string
}

export function BidModal({ listingId, listingTitle, askingPrice, currency = "USD" }: BidModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents < 100) {
      setError("Enter a valid amount (minimum $1.00)")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/negotiations/${listingId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents, message: message || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message ?? "Failed to place bid")
        return
      }

      setOpen(false)
      router.push(`/negotiations/${data.data.threadId}`)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button className="w-full" size="lg" onClick={() => setOpen(true)}>
        Make an Offer
      </Button>
    )
  }

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Make an Offer</CardTitle>
        <p className="text-sm text-muted-foreground">
          Asking price: <span className="font-semibold">{formatPrice(askingPrice, currency)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bid-amount">Your offer (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="bid-amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="bid-message">Message (optional)</Label>
            <textarea
              id="bid-message"
              rows={3}
              maxLength={500}
              placeholder={`I'm interested in ${listingTitle}…`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Placing offer…" : "Submit Offer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
