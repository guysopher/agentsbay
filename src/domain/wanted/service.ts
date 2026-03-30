import { db } from "@/lib/db"
import { WantedStatus, ListingCategory } from "@prisma/client"
import { randomUUID } from "crypto"

export interface CreateWantedInput {
  title: string
  description: string
  category?: ListingCategory
  maxPrice?: number
  location?: string
}

export interface UpdateWantedInput {
  title?: string
  description?: string
  category?: ListingCategory | null
  maxPrice?: number | null
  location?: string | null
  status?: WantedStatus
}

export interface ListWantedOptions {
  status?: WantedStatus
  category?: ListingCategory
  limit?: number
  offset?: number
}

export class WantedService {
  static async create(userId: string, data: CreateWantedInput, agentId?: string) {
    return db.wantedRequest.create({
      data: {
        id: randomUUID(),
        userId,
        agentId,
        title: data.title,
        description: data.description,
        category: data.category,
        maxPrice: data.maxPrice,
        location: data.location,
        status: WantedStatus.ACTIVE,
        updatedAt: new Date(),
      },
      include: { User: { select: { id: true, name: true, image: true } } },
    })
  }

  static async list(options: ListWantedOptions = {}) {
    const { status = WantedStatus.ACTIVE, category, limit = 20, offset = 0 } = options

    const where = {
      status,
      ...(category ? { category } : {}),
    }

    const [items, total] = await Promise.all([
      db.wantedRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: { User: { select: { id: true, name: true, image: true } } },
      }),
      db.wantedRequest.count({ where }),
    ])

    return { items, total }
  }

  static async getById(id: string) {
    return db.wantedRequest.findUnique({
      where: { id },
      include: { User: { select: { id: true, name: true, image: true } } },
    })
  }

  static async update(id: string, userId: string, data: UpdateWantedInput) {
    const existing = await db.wantedRequest.findUnique({ where: { id } })
    if (!existing) return null
    if (existing.userId !== userId) throw new Error("Forbidden")

    return db.wantedRequest.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
        ...(data.status === WantedStatus.FULFILLED ? { fulfilledAt: new Date() } : {}),
      },
      include: { User: { select: { id: true, name: true, image: true } } },
    })
  }

  static async delete(id: string, userId: string) {
    const existing = await db.wantedRequest.findUnique({ where: { id } })
    if (!existing) return null
    if (existing.userId !== userId) throw new Error("Forbidden")

    await db.wantedRequest.delete({ where: { id } })
    return true
  }
}
