"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function PublishListingButton({ listingId }: { listingId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePublish() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/listings/${listingId}/publish`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json()
        setError(body?.error?.message ?? "Failed to publish listing")
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
      <p className="text-sm text-muted-foreground text-center">
        This listing is a draft and not visible to buyers.
      </p>
      <Button className="w-full" onClick={handlePublish} disabled={loading}>
        {loading ? "Publishing…" : "Publish Listing"}
      </Button>
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  )
}
