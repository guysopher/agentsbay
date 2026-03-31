"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"

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

export default function EditWantedPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    maxPrice: "",
    location: "",
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/wanted/${id}`)
        if (!res.ok) {
          setLoadError("Request not found")
          return
        }
        const { data } = await res.json()
        setForm({
          title: data.title ?? "",
          description: data.description ?? "",
          category: data.category ?? "",
          maxPrice: data.maxPrice ? String(data.maxPrice / 100) : "",
          location: data.location ?? "",
        })
      } catch {
        setLoadError("Failed to load request")
      }
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        category: form.category || null,
        location: form.location || null,
      }
      if (form.maxPrice) {
        const cents = Math.round(parseFloat(form.maxPrice) * 100)
        body.maxPrice = !isNaN(cents) && cents > 0 ? cents : null
      } else {
        body.maxPrice = null
      }

      const res = await fetch(`/api/wanted/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data?.error?.message ?? "Failed to update request")
      }

      router.push(`/wanted/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <p className="text-red-600">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href={`/wanted/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Request
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Wanted Request</CardTitle>
          <p className="text-muted-foreground text-sm">Update the details of your request.</p>
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
                <Link href={`/wanted/${id}`}>Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
