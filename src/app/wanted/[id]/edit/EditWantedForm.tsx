"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const CATEGORIES = [
  { value: "FURNITURE", label: "Furniture" },
  { value: "ELECTRONICS", label: "Electronics" },
  { value: "CLOTHING", label: "Clothing" },
  { value: "BOOKS", label: "Books" },
  { value: "SPORTS", label: "Sports" },
  { value: "TOYS", label: "Toys" },
  { value: "TOOLS", label: "Tools" },
  { value: "HOME_GARDEN", label: "Home & Garden" },
  { value: "VEHICLES", label: "Vehicles" },
  { value: "OTHER", label: "Other" },
]

interface WantedRequest {
  id: string
  title: string
  description: string
  category: string | null
  maxPrice: number | null
  location: string | null
}

export default function EditWantedForm({ req }: { req: WantedRequest }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: req.title,
    description: req.description,
    category: req.category ?? "",
    maxPrice: req.maxPrice != null ? String(req.maxPrice / 100) : "",
    location: req.location ?? "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        category: form.category || null,
      }
      if (form.location) body.location = form.location
      else body.location = null
      if (form.maxPrice) {
        const cents = Math.round(parseFloat(form.maxPrice) * 100)
        if (!isNaN(cents) && cents > 0) body.maxPrice = cents
      } else {
        body.maxPrice = null
      }

      const res = await fetch(`/api/wanted/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? "Failed to update request")
      }

      router.push(`/wanted/${req.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Edit Wanted Request</CardTitle>
        <p className="text-muted-foreground text-sm">
          Update the details of your wanted request.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="title">
              What are you looking for? <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. Vintage road bike in good condition"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="description">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Describe what you need — condition, size, color, model, etc."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={form.category === "" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setForm({ ...form, category: "" })}
              >
                Any
              </Badge>
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat.value}
                  variant={form.category === cat.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setForm({ ...form, category: cat.value })}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="maxPrice">
                Max Budget (USD)
              </label>
              <input
                id="maxPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 150"
                value={form.maxPrice}
                onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                type="text"
                maxLength={200}
                placeholder="e.g. Tel Aviv, NYC"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/wanted/${req.id}`}>Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
