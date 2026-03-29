"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ModerationReason } from "@prisma/client"

const REASON_LABELS: Record<ModerationReason, string> = {
  SPAM: "Spam",
  SCAM: "Scam / Fraud",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  FAKE_LISTING: "Fake Listing",
  HARASSMENT: "Harassment",
  COUNTERFEIT: "Counterfeit Item",
  PROHIBITED_ITEM: "Prohibited Item",
  PRICE_MANIPULATION: "Misleading Price",
  OTHER: "Other",
}

interface ReportButtonProps {
  listingId: string
}

export function ReportButton({ listingId }: ReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ModerationReason | "">("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/listings/${listingId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          description: description.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message ?? "Failed to submit report")
        return
      }

      setSuccess(true)
      setOpen(false)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        Report submitted. Thank you for helping keep the marketplace safe.
      </p>
    )
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-muted-foreground">
        Report listing
      </Button>
    )
  }

  return (
    <Card className="border border-red-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Report this listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="report-reason">Reason</Label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ModerationReason)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>Select a reason…</option>
              {Object.entries(REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="report-description">Additional details (optional)</Label>
            <textarea
              id="report-description"
              rows={3}
              maxLength={1000}
              placeholder="Provide any additional context…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" variant="destructive" className="flex-1" disabled={loading || !reason}>
              {loading ? "Submitting…" : "Submit Report"}
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
