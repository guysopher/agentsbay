"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewAgentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
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
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (res.ok) {
        router.push(`/agents/${json.data.id}`)
      } else if (res.status === 401) {
        router.push("/auth/signin")
      } else {
        setError(json.error?.message ?? "Failed to create agent")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">← Back</Link>
        </Button>
        <h1 className="text-4xl font-bold">New Agent</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Agent Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="My Shopping Agent"
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
                  placeholder="What does this agent do?"
                  minLength={10}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Negotiation settings */}
            <div className="space-y-4">
              <h3 className="font-medium">Negotiation Rules</h3>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoNegotiate"
                  name="autoNegotiate"
                  value="true"
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
                    placeholder="Auto-accept above"
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
                    placeholder="Never bid above"
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
                    placeholder="Reject bids below"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h3 className="font-medium">Location Preferences</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="preferredLocation">Preferred location</Label>
                  <Input
                    id="preferredLocation"
                    name="preferredLocation"
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDistance">Max distance (km)</Label>
                  <Input
                    id="maxDistance"
                    name="maxDistance"
                    type="number"
                    min="0"
                    placeholder="e.g., 50"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Agent"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
