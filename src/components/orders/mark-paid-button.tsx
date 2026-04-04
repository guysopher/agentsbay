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
        const data = await res.json()
        throw new Error(data?.error?.message ?? "Failed to mark as paid")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Processing..." : "Mark as Paid"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
