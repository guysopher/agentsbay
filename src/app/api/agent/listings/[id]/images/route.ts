import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { db } from "@/lib/db"
import { NotFoundError } from "@/lib/errors"
import { z, ZodError } from "zod"
import { randomUUID } from "crypto"

const addImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  order: z.number().int().min(0).default(0).optional(),
})

const MAX_IMAGES_PER_LISTING = 10

export const { POST, GET } = createApiHandler({
  // GET /api/agent/listings/:id/images — list images for a listing
  GET: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      const listing = await db.listing.findFirst({
        where: { id: listingId, userId: auth.userId, deletedAt: null },
        select: { id: true },
      })
      if (!listing) throw new NotFoundError("Listing")

      const images = await db.listingImage.findMany({
        where: { listingId },
        orderBy: { order: "asc" },
      })

      return successResponse({
        images: images.map((img) => ({ id: img.id, url: img.url, order: img.order })),
        count: images.length,
      })
    } catch (error: unknown) {
      if (error instanceof NotFoundError) return errorResponse(error.message, 404)
      return errorResponse(
        error instanceof Error ? error.message : "Failed to fetch images",
        500
      )
    }
  },

  // POST /api/agent/listings/:id/images — register an image URL for a listing
  // Agents host images externally and register the URL here.
  // Accepts application/json {"url","order"} or multipart/form-data with "url"/"order" text fields.
  // Binary file uploads are not supported (no storage backend configured).
  POST: async (req, context) => {
    try {
      const authResult = await authenticateAgentRequest(req)
      if (authResult.response) {
        return authResult.response
      }
      const { auth } = authResult

      const params = await context.params
      const listingId = params.id

      const listing = await db.listing.findFirst({
        where: { id: listingId, userId: auth.userId, deletedAt: null },
        select: { id: true },
      })
      if (!listing) throw new NotFoundError("Listing")

      const contentType = req.headers.get("content-type") ?? ""
      let body: unknown

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData()
        // Reject binary file uploads — no storage backend is configured
        for (const [, value] of formData.entries()) {
          if (value instanceof File) {
            return errorResponse(
              "Binary file uploads are not supported. Please host the image externally and provide its URL via the 'url' field.",
              415
            )
          }
        }
        body = {
          url: formData.get("url"),
          order: formData.has("order") ? Number(formData.get("order")) : undefined,
        }
      } else {
        body = await req.json()
      }

      const validated = addImageSchema.parse(body)

      // Enforce per-listing image cap
      const existingCount = await db.listingImage.count({ where: { listingId } })
      if (existingCount >= MAX_IMAGES_PER_LISTING) {
        return errorResponse(`Listings may have at most ${MAX_IMAGES_PER_LISTING} images`, 400)
      }

      const image = await db.listingImage.create({
        data: {
          id: randomUUID(),
          listingId,
          url: validated.url,
          order: validated.order ?? existingCount,
        },
      })

      return successResponse(
        { id: image.id, listingId: image.listingId, url: image.url, order: image.order },
        201
      )
    } catch (error: unknown) {
      console.error("Agent add listing image error:", error)

      if (error instanceof ZodError) {
        return errorResponse(error.errors[0]?.message ?? "Invalid request body", 400)
      }
      if (error instanceof NotFoundError) {
        return errorResponse(error.message, 404)
      }
      return errorResponse(
        error instanceof Error ? error.message : "Failed to add image",
        500
      )
    }
  },
})
