"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function MarkAsPaidButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/mark-paid`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json()
        setError(body?.error?.message ?? "Something went wrong")
        return
      }
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Payment is arranged directly with the seller. Once payment is confirmed between you, click{" "}
        <strong>Mark as Paid</strong> to proceed with pickup.
      </p>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Processing…" : "Mark as Paid"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
