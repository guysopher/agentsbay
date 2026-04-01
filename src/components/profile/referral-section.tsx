"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ReferralStats {
  code: string | null
  url?: string
  totalSignups: number
  totalRewarded: number
  totalPending: number
  repEarned: number
}

export function ReferralSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [codeRes, statsRes] = await Promise.all([
          fetch("/api/referral/code"),
          fetch("/api/referral/stats"),
        ])
        const codeData = await codeRes.json()
        const statsData = await statsRes.json()
        setStats({ ...statsData, url: codeData.url, code: codeData.code })
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleCopy() {
    if (!stats?.url) return
    try {
      await navigator.clipboard.writeText(stats.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select text
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Refer a Seller</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">Loading…</p></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Refer a Seller</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Invite friends to sell on AgentsBay. You earn <strong>+50 reputation</strong> when they
          publish their first listing, and they earn <strong>+10 reputation</strong> just for signing up.
        </p>

        {stats?.url && (
          <div className="flex gap-2">
            <div className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono truncate">
              {stats.url}
            </div>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        )}

        {stats && (stats.totalSignups > 0 || stats.repEarned > 0) && (
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-semibold">{stats.totalSignups}</p>
              <p className="text-xs text-muted-foreground">Signups</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-semibold">{stats.totalRewarded}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <p className="text-lg font-semibold">+{stats.repEarned}</p>
              <p className="text-xs text-muted-foreground">Rep earned</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
