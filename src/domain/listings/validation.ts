import { z } from "zod"
import { ListingCategory, ItemCondition } from "@prisma/client"

// Input sanitization helper
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .trim()
}

// Custom refinement for sanitized strings
const sanitizedString = (schema: z.ZodString) =>
  schema.transform(sanitizeString)

// For optional string fields
const sanitizedOptionalString = () =>
  z.string().transform(sanitizeString).optional()

// Address validation for privacy protection
const APARTMENT_INDICATORS = /\b(apt|apartment|unit|floor|suite|ste|rm|room|#\d+)\b/i

export function validateAddressFormat(address: string): {
  valid: boolean
  error?: string
  sanitized?: string
} {
  const trimmed = address.trim()

  if (trimmed.length < 5) {
    return { valid: false, error: "Address must be at least 5 characters" }
  }

  if (APARTMENT_INDICATORS.test(trimmed)) {
    return {
      valid: false,
      error: "For privacy, please provide only the street address or city. Do not include apartment/unit numbers, floor details, or room numbers."
    }
  }

  // Check for patterns like "Apt 3B", "Floor 5", "#123"
  const specificPatterns = /\b\d+[A-Z]\b|Floor \d+|#\d+/i
  if (specificPatterns.test(trimmed)) {
    return {
      valid: false,
      error: "Address appears to contain apartment or floor details. Please use general street address only."
    }
  }

  return { valid: true, sanitized: trimmed }
}

export const createListingSchema = z.object({
  title: sanitizedString(
    z.string().min(3, "Title must be at least 3 characters").max(100)
  ),
  description: sanitizedString(
    z.string().min(10, "Description must be at least 10 characters").max(2000)
  ),
  labels: z.array(z.string()).default([]).optional(),
  category: z.nativeEnum(ListingCategory),
  condition: z.nativeEnum(ItemCondition),
  price: z.number().int().positive("Price must be positive"),
  priceMax: z.number().int().positive().optional(),
  currency: z.string().length(3).default("USD").optional(), // ISO currency code
  address: z.string()
    .min(5, "Address must be at least 5 characters")
    .max(200, "Address must be less than 200 characters")
    .refine(
      (val) => !APARTMENT_INDICATORS.test(val),
      {
        message: "For privacy, please provide only the street address or city. Do not include apartment/unit numbers, floor details, or room numbers. Examples: '123 Main St, Tel Aviv' or 'Downtown Seattle, WA'"
      }
    )
    .transform(sanitizeString),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contactWhatsApp: sanitizedString(z.string()).optional(),
  contactTelegram: sanitizedString(z.string()).optional(),
  contactDiscord: sanitizedString(z.string()).optional(),
  pickupAvailable: z.boolean().default(true).optional(),
  deliveryAvailable: z.boolean().default(false).optional(),
})

export const updateListingSchema = createListingSchema.partial()

export const SortBy = z.enum(["newest", "oldest", "price_asc", "price_desc", "relevance"])
export type SortBy = z.infer<typeof SortBy>

export const searchListingsSchema = z.object({
  query: sanitizedOptionalString(),
  category: z.nativeEnum(ListingCategory).optional(),
  minPrice: z.number().int().positive().optional(),
  maxPrice: z.number().int().positive().optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  address: sanitizedOptionalString(),
  sortBy: SortBy.default("newest"),
  cursor: z.string().optional(), // For cursor-based pagination
  limit: z.number().int().positive().max(100).default(20),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
export type SearchListingsInput = z.infer<typeof searchListingsSchema>
