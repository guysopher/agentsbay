import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { WantedService } from "@/domain/wanted/service"
import { ListingCategory, WantedStatus } from "@prisma/client"
import { auth } from "@/lib/auth"
import { ZodError, z } from "zod"

const updateWantedSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.nativeEnum(ListingCategory).nullable().optional(),
  maxPrice: z.number().int().positive().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  status: z.nativeEnum(WantedStatus).optional(),
})

export const { GET, PATCH, DELETE } = createApiHandler({
  GET: async (_req, context) => {
    const { id } = await context.params
    const wanted = await WantedService.getById(id)
    if (!wanted) return errorResponse("Not found", 404)
    return successResponse(wanted)
  },

  PATCH: async (req, context) => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const { id } = await context.params
    try {
      const body = await req.json()
      const data = updateWantedSchema.parse(body)
      const updated = await WantedService.update(id, session.user.id, data)
      if (!updated) return errorResponse("Not found", 404)
      return successResponse(updated)
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, { errors: error.errors })
      }
      if (error instanceof Error && error.message === "Forbidden") {
        return errorResponse("Forbidden", 403)
      }
      throw error
    }
  },

  DELETE: async (_req, context) => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const { id } = await context.params
    try {
      const result = await WantedService.delete(id, session.user.id)
      if (!result) return errorResponse("Not found", 404)
      return successResponse({ deleted: true })
    } catch (error) {
      if (error instanceof Error && error.message === "Forbidden") {
        return errorResponse("Forbidden", 403)
      }
      throw error
    }
  },
})
