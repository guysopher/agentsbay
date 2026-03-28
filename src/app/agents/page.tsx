"use client"

import { useEffect, useState } from "react"
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
  createdAt: string
}

export default function AgentsPage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  async function fetchAgents() {
    try {
      const res = await fetch("/api/agents")
      if (res.status === 401) {
        router.push("/auth/signin")
        return
      }
      const json = await res.json()
      setAgents(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: string) {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/agents/${id}/toggle`, { method: "POST" })
      if (res.ok) {
        const json = await res.json()
        setAgents((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isActive: json.data.isActive } : a))
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this agent? This cannot be undone.")) return
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" })
    if (res.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== id))
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Agents</h1>
        {agents.length < 5 && (
          <Button asChild>
            <Link href="/agents/new">New Agent</Link>
          </Button>
        )}
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You have no agents yet.</p>
            <Button asChild>
              <Link href="/agents/new">Create your first agent</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agents.length >= 5 && (
            <p className="text-sm text-muted-foreground">
              You have reached the 5-agent limit.
            </p>
          )}
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <Link
                      href={`/agents/${agent.id}`}
                      className="hover:underline"
                    >
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
                  <p className="text-sm text-muted-foreground mb-4">
                    {agent.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/agents/${agent.id}`}>Edit</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(agent.id)}
                    disabled={togglingId === agent.id}
                  >
                    {agent.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(agent.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
