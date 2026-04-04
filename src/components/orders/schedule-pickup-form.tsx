"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SchedulePickupForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pickupLocation, setPickupLocation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/schedule-pickup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupLocation }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? "Failed to schedule pickup")
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="pickup-location">Pickup location</Label>
        <Input
          id="pickup-location"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          placeholder="e.g. 123 Main St, front door"
          minLength={3}
          maxLength={500}
          required
          disabled={loading}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Scheduling..." : "Schedule Pickup"}
      </Button>
    </form>
  )
}
