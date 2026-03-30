import type { ListingCategory, ItemCondition } from "@prisma/client"

export type CommandIntent = "search" | "create-listing" | "unknown"

export interface CommandParams {
  query?: string
  category?: ListingCategory
  minPrice?: number
  maxPrice?: number
  condition?: ItemCondition
  address?: string
  // create-listing extras
  title?: string
  price?: number
}

export interface ParsedCommand {
  intent: CommandIntent
  params: CommandParams
}

// ─── Keyword maps ─────────────────────────────────────────────────────────────

const SEARCH_TRIGGERS = /\b(find|search|show|look for|get me)\b/i

const CREATE_TRIGGERS = /\b(list|sell|post|create listing)\b/i

const CATEGORY_MAP: Record<string, ListingCategory> = {
  electronics: "ELECTRONICS",
  electronic:  "ELECTRONICS",
  laptop:      "ELECTRONICS",
  laptops:     "ELECTRONICS",
  phone:       "ELECTRONICS",
  phones:      "ELECTRONICS",
  camera:      "ELECTRONICS",
  cameras:     "ELECTRONICS",
  furniture:   "FURNITURE",
  chair:       "FURNITURE",
  chairs:      "FURNITURE",
  table:       "FURNITURE",
  tables:      "FURNITURE",
  sofa:        "FURNITURE",
  sofas:       "FURNITURE",
  clothing:    "CLOTHING",
  clothes:     "CLOTHING",
  apparel:     "CLOTHING",
  shirt:       "CLOTHING",
  books:       "BOOKS",
  book:        "BOOKS",
  magazine:    "BOOKS",
  sports:      "SPORTS",
  sport:       "SPORTS",
  equipment:   "SPORTS",
  toys:        "TOYS",
  toy:         "TOYS",
  tools:       "TOOLS",
  tool:        "TOOLS",
  home:        "HOME_GARDEN",
  garden:      "HOME_GARDEN",
  decor:       "HOME_GARDEN",
  automotive:  "VEHICLES",
  vehicle:     "VEHICLES",
  vehicles:    "VEHICLES",
  car:         "VEHICLES",
  cars:        "VEHICLES",
  bike:        "VEHICLES",
  bikes:       "VEHICLES",
  scooter:     "VEHICLES",
  other:       "OTHER",
}

const CONDITION_MAP: Record<string, ItemCondition> = {
  "new":       "NEW",
  "brand new": "NEW",
  "like new":  "LIKE_NEW",
  "good":      "GOOD",
  "fair":      "FAIR",
  "poor":      "POOR",
}

// ─── Price parsing helpers ─────────────────────────────────────────────────────

/** Parse a dollar string like "$120", "120", "1,200" into cents */
function parseDollars(raw: string): number {
  const cleaned = raw.replace(/[$,]/g, "")
  const value = parseFloat(cleaned)
  return Math.round(value * 100)
}

// ─── Main parser ───────────────────────────────────────────────────────────────

export function parseCommand(input: string): ParsedCommand {
  let remaining = input.trim()
  const params: CommandParams = {}

  // ── Detect intent ────────────────────────────────────────────────────────────
  let intent: CommandIntent
  if (CREATE_TRIGGERS.test(remaining)) {
    intent = "create-listing"
    remaining = remaining.replace(CREATE_TRIGGERS, "").trim()
  } else if (SEARCH_TRIGGERS.test(remaining)) {
    intent = "search"
    remaining = remaining.replace(SEARCH_TRIGGERS, "").trim()
  } else {
    intent = "search" // implicit search (e.g. "chair under $50")
  }

  // ── Price range: "between $N and $N" | "$N-$N" | "$N to $N" ─────────────────
  const rangePatterns = [
    /between\s+\$?([\d,.]+)\s+and\s+\$?([\d,.]+)/i,
    /\$?([\d,.]+)\s*-\s*\$?([\d,.]+)/,
    /\$?([\d,.]+)\s+to\s+\$?([\d,.]+)/i,
  ]
  for (const pattern of rangePatterns) {
    const m = remaining.match(pattern)
    if (m) {
      params.minPrice = parseDollars(m[1])
      params.maxPrice = parseDollars(m[2])
      remaining = remaining.replace(m[0], "").trim()
      break
    }
  }

  // ── Price ceiling (only if no range matched yet) ──────────────────────────────
  if (params.minPrice === undefined && params.maxPrice === undefined) {
    const ceilingPattern =
      /(?:under|below|less than|max|for)\s+\$?([\d,.]+)/i
    const m = remaining.match(ceilingPattern)
    if (m) {
      params.maxPrice = parseDollars(m[1])
      remaining = remaining.replace(m[0], "").trim()
    }
  }

  // ── Price floor (only if no range matched yet) ────────────────────────────────
  if (params.minPrice === undefined) {
    const floorPattern =
      /(?:over|above|more than|min)\s+\$?([\d,.]+)/i
    const m = remaining.match(floorPattern)
    if (m) {
      params.minPrice = parseDollars(m[1])
      remaining = remaining.replace(m[0], "").trim()
    }
  }

  // ── Condition (multi-word first, then single-word) ────────────────────────────
  for (const phrase of ["brand new", "like new"] as const) {
    const re = new RegExp(`\\b${phrase}\\b`, "i")
    if (re.test(remaining)) {
      params.condition = CONDITION_MAP[phrase]
      remaining = remaining.replace(re, "").trim()
    }
  }
  if (!params.condition) {
    for (const word of ["new", "good", "fair", "poor"] as const) {
      const re = new RegExp(`\\b${word}\\b`, "i")
      if (re.test(remaining)) {
        params.condition = CONDITION_MAP[word]
        remaining = remaining.replace(re, "").trim()
        break
      }
    }
  }

  // ── Location: "near X", "in X", "around X" ───────────────────────────────────
  const locationPattern = /(?:near|in|around)\s+([A-Za-z][A-Za-z0-9\s,.-]{1,80}?)(?=\s*(?:under|below|over|above|between|\$|less|more|max|min|new|good|fair|poor|like|brand|$))/i
  const locMatch = remaining.match(locationPattern)
  if (locMatch) {
    params.address = locMatch[1].trim()
    remaining = remaining.replace(locMatch[0], "").trim()
  }

  // ── Category: match longest word in remaining ─────────────────────────────────
  {
    // Try multi-word keys first (none currently), then single-word
    const words = remaining.toLowerCase().split(/\s+/)
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "")
      if (CATEGORY_MAP[clean]) {
        params.category = CATEGORY_MAP[clean]
        const re = new RegExp(`\\b${clean}\\b`, "i")
        remaining = remaining.replace(re, "").trim()
        break
      }
    }
  }

  // ── Remaining text → query (search) or title (create-listing) ────────────────
  const cleaned = remaining.replace(/\s{2,}/g, " ").trim()
  if (cleaned) {
    if (intent === "create-listing") {
      params.title = cleaned
    } else {
      params.query = cleaned
    }
  }

  // ── For create-listing, promote maxPrice to price ─────────────────────────────
  if (intent === "create-listing" && params.maxPrice !== undefined && params.price === undefined) {
    params.price = params.maxPrice
    delete params.maxPrice
  }

  // ── Unknown fallback: if no meaningful params and no search trigger ───────────
  // Already defaulted to "search" for implicit queries, keep as-is.

  return { intent, params }
}
