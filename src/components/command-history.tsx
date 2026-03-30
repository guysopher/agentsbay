"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Plus, HelpCircle, RefreshCw, Clock } from "lucide-react"
import { formatDate } from "@/lib/formatting"

interface SkillExecution {
  id: string
  input: { command?: string }
  output: {
    intent?: string
    results?: unknown[]
  } | null
  status: string
  createdAt: string
}

interface CommandHistoryProps {
  agentId: string
  onRerun?: (command: string) => void
}

function IntentIcon({ intent }: { intent?: string }) {
  if (intent === "search" || intent === "unknown") return <Search className="h-3 w-3" />
  if (intent === "create-listing") return <Plus className="h-3 w-3" />
  return <HelpCircle className="h-3 w-3" />
}

export function CommandHistory({ agentId, onRerun }: CommandHistoryProps) {
  const [history, setHistory] = useState<SkillExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agents/${agentId}/skills/history?limit=10`)
      if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
      const data = await res.json()
      const executions: SkillExecution[] = (data.data?.executions ?? data.data ?? []).filter(
        (e: SkillExecution) => e.input?.command
      )
      setHistory(executions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history")
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Loading history…
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 text-center py-4">{error}</div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No command history yet. Run your first command above.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Recent Commands
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-6 px-2"
          onClick={fetchHistory}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh
        </Button>
      </div>

      {history.map((execution) => {
        const cmd = execution.input.command ?? ""
        const intent = execution.output?.intent
        const resultCount = Array.isArray(execution.output?.results)
          ? execution.output!.results!.length
          : undefined

        return (
          <button
            key={execution.id}
            onClick={() => onRerun?.(cmd)}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors group"
          >
            <div className="text-muted-foreground">
              <IntentIcon intent={intent} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{cmd}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(execution.createdAt)}
                {resultCount !== undefined && (
                  <span className="ml-2">{resultCount} result{resultCount !== 1 ? "s" : ""}</span>
                )}
              </p>
            </div>

            {intent && (
              <Badge variant="secondary" className="text-xs shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                {intent === "create-listing" ? "create" : intent}
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
