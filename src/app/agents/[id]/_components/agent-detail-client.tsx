"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Agent {
  id: string
  name: string
  description: string | null
  isActive: boolean
  autoNegotiate: boolean
  autoCounterEnabled: boolean
  requireApproval: boolean
  maxBidAmount: number | null
  minAcceptAmount: number | null
  maxAcceptAmount: number | null
  autoRejectBelow: number | null
  preferredLocation: string | null
  maxDistance: number | null
}

interface Props {
  agent: Agent
}

const centsToDisplay = (cents: number | null) =>
  cents !== null ? (cents / 100).toFixed(2) : ""

export function AgentDetailClient({ agent: initialAgent }: Props) {
  const router = useRouter()
  const [agent, setAgent] = useState(initialAgent)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      autoNegotiate: formData.get("autoNegotiate") === "true",
      autoCounterEnabled: formData.get("autoCounterEnabled") === "true",
      requireApproval: formData.get("requireApproval") !== "false",
      maxBidAmount: formData.get("maxBidAmount")
        ? Math.round(Number(formData.get("maxBidAmount")) * 100)
        : undefined,
      minAcceptAmount: formData.get("minAcceptAmount")
        ? Math.round(Number(formData.get("minAcceptAmount")) * 100)
        : undefined,
      autoRejectBelow: formData.get("autoRejectBelow")
        ? Math.round(Number(formData.get("autoRejectBelow")) * 100)
        : undefined,
      preferredLocation: (formData.get("preferredLocation") as string) || undefined,
      maxDistance: formData.get("maxDistance")
        ? Number(formData.get("maxDistance"))
        : undefined,
    }

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok) {
        setAgent(json.data)
        setEditing(false)
      } else {
        setError(json.error?.message ?? "Failed to save")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle() {
    setToggling(true)
    const res = await fetch(`/api/agents/${agent.id}/toggle`, { method: "POST" })
    if (res.ok) {
      const json = await res.json()
      setAgent((prev) => ({ ...prev, isActive: json.data.isActive }))
    }
    setToggling(false)
  }

  async function handleDelete() {
    if (!confirm("Delete this agent? This cannot be undone.")) return
    const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/agents")
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">← Back</Link>
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <Badge variant={agent.isActive ? "default" : "secondary"}>
            {agent.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
          >
            {agent.isActive ? "Deactivate" : "Activate"}
          </Button>
          {!editing && (
            <Button size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {!editing ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {agent.description && (
                <p className="text-muted-foreground">{agent.description}</p>
              )}
              <div className="flex gap-2 flex-wrap pt-1">
                {agent.autoNegotiate && (
                  <Badge variant="outline">Auto-negotiate</Badge>
                )}
                {agent.autoCounterEnabled && (
                  <Badge variant="outline">Auto-counter</Badge>
                )}
                {!agent.requireApproval && (
                  <Badge variant="outline">No approval needed</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Negotiation Rules</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
              <span className="text-muted-foreground">Min accept</span>
              <span>
                {agent.minAcceptAmount
                  ? `$${centsToDisplay(agent.minAcceptAmount)}`
                  : "—"}
              </span>
              <span className="text-muted-foreground">Max accept</span>
              <span>
                {agent.maxAcceptAmount
                  ? `$${centsToDisplay(agent.maxAcceptAmount)}`
                  : "—"}
              </span>
              <span className="text-muted-foreground">Max bid</span>
              <span>
                {agent.maxBidAmount
                  ? `$${centsToDisplay(agent.maxBidAmount)}`
                  : "—"}
              </span>
              <span className="text-muted-foreground">Auto-reject below</span>
              <span>
                {agent.autoRejectBelow
                  ? `$${centsToDisplay(agent.autoRejectBelow)}`
                  : "—"}
              </span>
            </CardContent>
          </Card>

          {(agent.preferredLocation || agent.maxDistance) && (
            <Card>
              <CardHeader>
                <CardTitle>Location Preferences</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
                <span className="text-muted-foreground">Location</span>
                <span>{agent.preferredLocation ?? "—"}</span>
                <span className="text-muted-foreground">Max distance</span>
                <span>
                  {agent.maxDistance ? `${agent.maxDistance} km` : "—"}
                </span>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={agent.name}
                    required
                    minLength={3}
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    name="description"
                    className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                    defaultValue={agent.description ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Negotiation Rules</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoNegotiate"
                    name="autoNegotiate"
                    value="true"
                    defaultChecked={agent.autoNegotiate}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="autoNegotiate" className="cursor-pointer">
                    Enable auto-negotiation
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="autoCounterEnabled"
                    name="autoCounterEnabled"
                    value="true"
                    defaultChecked={agent.autoCounterEnabled}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="autoCounterEnabled" className="cursor-pointer">
                    Enable auto-counter offers
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="requireApproval"
                    name="requireApproval"
                    value="false"
                    defaultChecked={!agent.requireApproval}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="requireApproval" className="cursor-pointer">
                    Skip approval (act autonomously)
                  </Label>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="minAcceptAmount">Min accept ($)</Label>
                    <Input
                      id="minAcceptAmount"
                      name="minAcceptAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={centsToDisplay(agent.minAcceptAmount)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxBidAmount">Max bid ($)</Label>
                    <Input
                      id="maxBidAmount"
                      name="maxBidAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={centsToDisplay(agent.maxBidAmount)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="autoRejectBelow">Auto-reject below ($)</Label>
                    <Input
                      id="autoRejectBelow"
                      name="autoRejectBelow"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={centsToDisplay(agent.autoRejectBelow)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Location Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="preferredLocation">Preferred location</Label>
                    <Input
                      id="preferredLocation"
                      name="preferredLocation"
                      defaultValue={agent.preferredLocation ?? ""}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxDistance">Max distance (km)</Label>
                    <Input
                      id="maxDistance"
                      name="maxDistance"
                      type="number"
                      min="0"
                      defaultValue={agent.maxDistance ?? ""}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}
