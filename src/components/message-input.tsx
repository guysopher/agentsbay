"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface MessageInputProps {
  listingId: string
}

export function MessageInput({ listingId }: MessageInputProps) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/negotiations/${listingId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error?.message ?? "Failed to send message")
        return
      }
      setContent("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="flex gap-2">
      <textarea
        rows={2}
        maxLength={2000}
        placeholder="Send a message…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (content.trim()) handleSend(e as unknown as React.FormEvent)
          }
        }}
      />
      <Button type="submit" disabled={loading || !content.trim()} className="self-end">
        {loading ? "Sending…" : "Send"}
      </Button>
      {error && <p className="text-sm text-red-500 self-center">{error}</p>}
    </form>
  )
}
