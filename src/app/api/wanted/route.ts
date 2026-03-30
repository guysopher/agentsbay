import { createApiHandler, successResponse, paginatedResponse, errorResponse } from "@/lib/api-handler"
import { WantedService } from "@/domain/wanted/service"
import { ListingCategory, WantedStatus } from "@prisma/client"
import { auth } from "@/lib/auth"
import { ZodError, z } from "zod"

const createWantedSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(2000),
  category: z.nativeEnum(ListingCategory).optional(),
  maxPrice: z.number().int().positive().optional(),
  location: z.string().max(200).optional(),
})

export const { GET, POST } = createApiHandler({
  GET: async (req) => {
    const { searchParams } = req.nextUrl
    const status = (searchParams.get("status") as WantedStatus | null) ?? WantedStatus.ACTIVE
    const category = searchParams.get("category") as ListingCategory | null
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100)
    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1)
    const offset = (page - 1) * limit

    const { items, total } = await WantedService.list({
      status: Object.values(WantedStatus).includes(status) ? status : WantedStatus.ACTIVE,
      category: category && Object.values(ListingCategory).includes(category) ? category : undefined,
      limit,
      offset,
    })

    return paginatedResponse(items, { page, pageSize: limit, total })
  },

  POST: async (req) => {
    const session = await auth()
    if (!session?.user?.id) {
      return errorResponse("Unauthorized", 401)
    }

    try {
      const body = await req.json()
      const data = createWantedSchema.parse(body)
      const wanted = await WantedService.create(session.user.id, data)
      return successResponse(wanted, 201)
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, { errors: error.errors })
      }
      throw error
    }
  },
})
