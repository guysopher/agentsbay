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

export const createListingSchema = z.object({
  title: sanitizedString(
    z.string().min(3, "Title must be at least 3 characters").max(100)
  ),
  description: sanitizedString(
    z.string().min(10, "Description must be at least 10 characters").max(2000)
  ),
  category: z.nativeEnum(ListingCategory),
  condition: z.nativeEnum(ItemCondition),
  price: z.number().int().positive("Price must be positive"),
  location: sanitizedString(z.string().min(2, "Location is required")),
  pickupAvailable: z.boolean().default(true),
  deliveryAvailable: z.boolean().default(false),
})

export const updateListingSchema = createListingSchema.partial()

export const searchListingsSchema = z.object({
  query: sanitizedString(z.string()).optional(),
  category: z.nativeEnum(ListingCategory).optional(),
  minPrice: z.number().int().positive().optional(),
  maxPrice: z.number().int().positive().optional(),
  condition: z.nativeEnum(ItemCondition).optional(),
  location: sanitizedString(z.string()).optional(),
  cursor: z.string().optional(), // For cursor-based pagination
  limit: z.number().int().positive().max(100).default(20),
})

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>
export type SearchListingsInput = z.infer<typeof searchListingsSchema>
