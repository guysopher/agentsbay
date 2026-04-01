"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ConnectStatus = "not_connected" | "pending" | "connected" | "loading"

const STATUS_BADGE: Record<ConnectStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  loading: { label: "Checking...", variant: "outline" },
  not_connected: { label: "Not connected", variant: "outline" },
  pending: { label: "Onboarding in progress", variant: "secondary" },
  connected: { label: "Connected", variant: "default" },
}

export function StripeConnectSection() {
  const [status, setStatus] = useState<ConnectStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    fetch("/api/users/stripe/connect/status")
      .then((r) => r.json())
      .then((d) => setStatus(d?.data?.status ?? "not_connected"))
      .catch(() => setStatus("not_connected"))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch("/api/users/stripe/connect", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? "Failed to start onboarding")
      window.location.href = data.data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setConnecting(false)
    }
  }

  const badge = STATUS_BADGE[status]

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Stripe Payments</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connect Stripe to receive payouts when you sell items
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {status !== "connected" && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleConnect}
          disabled={connecting || status === "loading"}
        >
          {connecting
            ? "Redirecting..."
            : status === "pending"
            ? "Continue onboarding"
            : "Connect Stripe"}
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
