"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface NegotiationActionsProps {
  bidId: string
  threadId: string
  isSeller: boolean
}

export function NegotiationActions({ bidId, threadId, isSeller }: NegotiationActionsProps) {
  const router = useRouter()
  const [showCounter, setShowCounter] = useState(false)
  const [counterAmount, setCounterAmount] = useState("")
  const [counterMessage, setCounterMessage] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setLoading("accept")
    setError(null)
    try {
      const res = await fetch(`/api/negotiations/bids/${bidId}/accept`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? "Failed to accept")
        return
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    setError(null)
    try {
      const res = await fetch(`/api/negotiations/bids/${bidId}/reject`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? "Failed to reject")
        return
      }
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  async function handleCounter(e: React.FormEvent) {
    e.preventDefault()
    const amountCents = Math.round(parseFloat(counterAmount) * 100)
    if (isNaN(amountCents) || amountCents < 100) {
      setError("Enter a valid counter amount")
      return
    }
    setLoading("counter")
    setError(null)
    try {
      const res = await fetch(`/api/negotiations/bids/${bidId}/counter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountCents, message: counterMessage || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? "Failed to counter")
        return
      }
      setShowCounter(false)
      setCounterAmount("")
      setCounterMessage("")
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  if (showCounter) {
    return (
      <form onSubmit={handleCounter} className="space-y-3 p-4 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <Label htmlFor="counter-amount">Counter offer (USD)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="counter-amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              className="pl-7"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="counter-message">Message (optional)</Label>
          <textarea
            id="counter-message"
            rows={2}
            maxLength={500}
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!!loading}>
            {loading === "counter" ? "Sending…" : "Send Counter"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { setShowCounter(false); setError(null) }}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={!!loading}
          className="bg-green-600 hover:bg-green-700"
        >
          {loading === "accept" ? "Accepting…" : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCounter(true)}
          disabled={!!loading}
        >
          Counter
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={!!loading}
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </div>
  )
}
