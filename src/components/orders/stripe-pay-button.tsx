"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function StripePayButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/checkout`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to start checkout")
      }
      window.location.href = data.data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Redirecting to Stripe..." : "Pay Now"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
