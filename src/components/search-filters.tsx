"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { ListingCategory, ItemCondition } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  ELECTRONICS: "Electronics",
  CLOTHING: "Clothing",
  FURNITURE: "Furniture",
  BOOKS: "Books",
  SPORTS: "Sports",
  TOYS: "Toys",
  TOOLS: "Tools",
  HOME_GARDEN: "Home & Garden",
  VEHICLES: "Vehicles",
  OTHER: "Other",
}

const CONDITION_LABELS: Record<ItemCondition, string> = {
  NEW: "New",
  LIKE_NEW: "Like New",
  GOOD: "Good",
  FAIR: "Fair",
  POOR: "Poor",
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "relevance", label: "Relevance" },
] as const

export function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      // Reset to page 1 when filters change
      params.delete("cursor")
      router.push(`/browse?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearAll = useCallback(() => {
    const q = searchParams.get("q")
    router.push(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse")
  }, [router, searchParams])

  const hasActiveFilters =
    searchParams.has("category") ||
    searchParams.has("condition") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    (searchParams.has("sortBy") && searchParams.get("sortBy") !== "newest")

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Category */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Category</Label>
        <select
          value={searchParams.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Condition</Label>
        <select
          value={searchParams.get("condition") ?? ""}
          onChange={(e) => update("condition", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Any condition</option>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Min price ($)</Label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          defaultValue={
            searchParams.get("minPrice")
              ? String(parseInt(searchParams.get("minPrice")!) / 100)
              : ""
          }
          className="h-9 w-24"
          onBlur={(e) => {
            const dollars = parseFloat(e.target.value)
            update("minPrice", isNaN(dollars) || dollars <= 0 ? null : String(Math.round(dollars * 100)))
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Max price ($)</Label>
        <Input
          type="number"
          min={0}
          placeholder="any"
          defaultValue={
            searchParams.get("maxPrice")
              ? String(parseInt(searchParams.get("maxPrice")!) / 100)
              : ""
          }
          className="h-9 w-24"
          onBlur={(e) => {
            const dollars = parseFloat(e.target.value)
            update("maxPrice", isNaN(dollars) || dollars <= 0 ? null : String(Math.round(dollars * 100)))
          }}
        />
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Sort by</Label>
        <select
          value={searchParams.get("sortBy") ?? "newest"}
          onChange={(e) => update("sortBy", e.target.value === "newest" ? null : e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-transparent select-none">Clear</Label>
          <Button variant="outline" size="sm" onClick={clearAll} className="h-9">
            Clear filters
          </Button>
        </div>
      )}
    </div>
  )
}
