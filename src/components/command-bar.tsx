"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/formatting"
import { Search, Plus, HelpCircle, Loader2, X, MapPin } from "lucide-react"
import Link from "next/link"
import type { CommandIntent } from "@/lib/command-parser"

interface ListingResult {
  id: string
  title: string
  price: number
  currency: string
  category: string
  condition: string
  address: string
  status: string
  publishedAt: string | null
  images: { url: string }[]
}

interface CommandResult {
  intent: CommandIntent
  parsed: {
    query?: string
    category?: string
    minPrice?: number
    maxPrice?: number
    condition?: string
    address?: string
    title?: string
    price?: number
  }
  results?: ListingResult[]
  redirectUrl?: string
}

function IntentIcon({ intent }: { intent: CommandIntent }) {
  if (intent === "search") return <Search className="h-4 w-4" />
  if (intent === "create-listing") return <Plus className="h-4 w-4" />
  return <HelpCircle className="h-4 w-4" />
}

function IntentBadge({ intent }: { intent: CommandIntent | null }) {
  if (!intent) return null
  const colors: Record<CommandIntent, string> = {
    "search": "bg-blue-100 text-blue-700 border-blue-200",
    "create-listing": "bg-green-100 text-green-700 border-green-200",
    "unknown": "bg-gray-100 text-gray-700 border-gray-200",
  }
  const labels: Record<CommandIntent, string> = {
    "search": "Search",
    "create-listing": "Create listing",
    "unknown": "Search",
  }
  return (
    <Badge variant="outline" className={`text-xs ${colors[intent]}`}>
      <IntentIcon intent={intent} />
      <span className="ml-1">{labels[intent]}</span>
    </Badge>
  )
}

interface CommandBarProps {
  agentId?: string
  /** inline = embedded in page; floating = full-screen overlay */
  mode?: "inline" | "floating"
  onClose?: () => void
}

export function CommandBar({ agentId, mode = "inline", onClose }: CommandBarProps) {
  const [command, setCommand] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CommandResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewIntent, setPreviewIntent] = useState<CommandIntent | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Auto-focus when shown as floating
  useEffect(() => {
    if (mode === "floating") {
      inputRef.current?.focus()
    }
  }, [mode])

  // Dismiss on Escape
  useEffect(() => {
    if (mode !== "floating") return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [mode, onClose])

  // Preview intent as user types (client-side, no API call)
  useEffect(() => {
    if (!command.trim()) {
      setPreviewIntent(null)
      return
    }
    const CREATE_RE = /\b(list|sell|post|create listing)\b/i
    const SEARCH_RE = /\b(find|search|show|look for|get me)\b/i
    if (CREATE_RE.test(command)) setPreviewIntent("create-listing")
    else if (SEARCH_RE.test(command)) setPreviewIntent("search")
    else setPreviewIntent("unknown")
  }, [command])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      const trimmed = command.trim()
      if (!trimmed) return

      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const res = await fetch("/api/commands/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: trimmed, agentId }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error?.message ?? `Request failed (${res.status})`)
        }

        const data = await res.json()
        const cmdResult: CommandResult = data.data

        if (cmdResult.redirectUrl) {
          router.push(cmdResult.redirectUrl)
          onClose?.()
          return
        }

        setResult(cmdResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    },
    [command, agentId, router, onClose]
  )

  const inner = (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='Try "find a laptop under $500" or "sell my bike"'
            className="pr-20"
            disabled={loading}
          />
          {previewIntent && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <IntentBadge intent={previewIntent} />
            </div>
          )}
        </div>
        <Button type="submit" disabled={loading || !command.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        {mode === "floating" && (
          <Button variant="ghost" size="icon" type="button" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </form>

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {result && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <IntentBadge intent={result.intent} />
            {result.results !== undefined && (
              <span>{result.results.length} result{result.results.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {result.results && result.results.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {result.results.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{listing.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-blue-600 font-semibold text-sm">
                        {formatPrice(listing.price, listing.currency)}
                      </span>
                      <Badge variant="secondary" className="text-xs">{listing.condition}</Badge>
                      <Badge variant="outline" className="text-xs">{listing.category}</Badge>
                    </div>
                    {listing.address && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {listing.address}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {result.results && result.results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No listings found. Try a different search.
            </p>
          )}
        </div>
      )}
    </div>
  )

  if (mode === "floating") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.()
        }}
      >
        <div className="w-full max-w-2xl mx-4 bg-white rounded-xl shadow-2xl p-4">
          <p className="text-xs text-muted-foreground mb-2">
            Press <kbd className="px-1 py-0.5 text-xs bg-gray-100 rounded border">Esc</kbd> to close
          </p>
          {inner}
        </div>
      </div>
    )
  }

  return inner
}

/**
 * Global Cmd+K keyboard listener that opens the floating CommandBar.
 * Mount once at the root layout level.
 */
export function CommandBarProvider({ agentId }: { agentId?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [])

  if (!open) return null
  return (
    <CommandBar
      agentId={agentId}
      mode="floating"
      onClose={() => setOpen(false)}
    />
  )
}
