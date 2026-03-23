"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewListingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get("title"),
      description: formData.get("description"),
      category: formData.get("category"),
      condition: formData.get("condition"),
      price: Number(formData.get("price")) * 100, // Convert to cents
      location: formData.get("location"),
    }

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        const listing = await res.json()
        router.push(`/listings/${listing.id}`)
      } else {
        alert("Failed to create listing")
      }
    } catch (error) {
      console.error(error)
      alert("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8">Create a Listing</h1>

      <Card>
        <CardHeader>
          <CardTitle>List Your Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Office Chair - Almost New"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                placeholder="Describe your item in detail..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  required
                >
                  <option value="FURNITURE">Furniture</option>
                  <option value="ELECTRONICS">Electronics</option>
                  <option value="CLOTHING">Clothing</option>
                  <option value="BOOKS">Books</option>
                  <option value="SPORTS">Sports</option>
                  <option value="TOYS">Toys</option>
                  <option value="TOOLS">Tools</option>
                  <option value="HOME_GARDEN">Home & Garden</option>
                  <option value="VEHICLES">Vehicles</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="condition">Condition</Label>
                <select
                  id="condition"
                  name="condition"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  required
                >
                  <option value="NEW">New</option>
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="City, State"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
