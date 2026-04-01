"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function OrderReferralCta() {
  const [url, setUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch("/api/referral/code")
      .then((r) => r.json())
      .then((d) => setUrl(d.url ?? null))
      .catch(() => {})
  }, [])

  async function handleCopy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (!url) return null

  return (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-green-900">Know another seller?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-green-800">
          Share your referral link and earn <strong>+50 reputation</strong> when they publish their
          first listing.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-sm font-mono truncate text-green-900">
            {url}
          </div>
          <Button size="sm" variant="outline" onClick={handleCopy} className="border-green-300 text-green-800 hover:bg-green-100">
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
