"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Agent {
  id: string
  name: string
  description: string | null
  isActive: boolean
  autoNegotiate: boolean
  requireApproval: boolean
}

export function AgentCard({ agent: initialAgent }: { agent: Agent }) {
  const router = useRouter()
  const [agent, setAgent] = useState(initialAgent)
  const [toggling, setToggling] = useState(false)

  async function handleToggle() {
    setToggling(true)
    try {
      const res = await fetch(`/api/agents/${agent.id}/toggle`, { method: "POST" })
      if (res.ok) {
        const json = await res.json()
        setAgent((prev) => ({ ...prev, isActive: json.data.isActive }))
      }
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this agent? This cannot be undone.")) return
    const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" })
    if (res.ok) {
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            <Link href={`/agents/${agent.id}`} className="hover:underline">
              {agent.name}
            </Link>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={agent.isActive ? "default" : "secondary"}>
              {agent.isActive ? "Active" : "Inactive"}
            </Badge>
            {agent.autoNegotiate && (
              <Badge variant="outline">Auto-negotiate</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {agent.description && (
          <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/agents/${agent.id}`}>Edit</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
          >
            {agent.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
