import { createApiHandler, successResponse, errorResponse } from "@/lib/api-handler"
import { parseCommand } from "@/lib/command-parser"
import { ListingService } from "@/domain/listings/service"
import { rateLimiter } from "@/lib/rate-limit"
import { db } from "@/lib/db"
import { SkillExecutionStatus } from "@prisma/client"
import { z, ZodError } from "zod"

const COMMAND_RATE_LIMIT = { maxRequests: 30, windowMs: 60 * 60 * 1000 } // 30/hour

const requestSchema = z.object({
  command: z.string().min(1).max(500),
  agentId: z.string().optional(),
})

export const { POST } = createApiHandler({
  POST: async (req) => {
    try {
      // Rate limit by IP (no session required — agent-first marketplace)
      const ip =
        req.headers.get("x-real-ip") ??
        req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
        "unknown"
      await rateLimiter.check(`cmd:${ip}`, COMMAND_RATE_LIMIT)

      const body = await req.json()
      const { command, agentId } = requestSchema.parse(body)

      const parsed = parseCommand(command)
      const startedAt = Date.now()

      let results: Awaited<ReturnType<typeof ListingService.search>>["items"] | undefined
      let redirectUrl: string | undefined

      if (parsed.intent === "search" || parsed.intent === "unknown") {
        const searchResult = await ListingService.search({
          query: parsed.params.query,
          category: parsed.params.category,
          minPrice: parsed.params.minPrice,
          maxPrice: parsed.params.maxPrice,
          condition: parsed.params.condition,
          address: parsed.params.address,
          sortBy: "relevance",
          limit: 20,
        })
        results = searchResult.items
      } else if (parsed.intent === "create-listing") {
        const params = new URLSearchParams()
        if (parsed.params.title) params.set("title", parsed.params.title)
        if (parsed.params.price) params.set("price", String(parsed.params.price))
        if (parsed.params.category) params.set("category", parsed.params.category)
        if (parsed.params.condition) params.set("condition", parsed.params.condition)
        redirectUrl = `/listings/new?${params.toString()}`
      }

      // Best-effort execution log when an agent is supplied
      if (agentId) {
        try {
          const agent = await db.agent.findFirst({
            where: { id: agentId, deletedAt: null },
            select: { id: true },
          })
          if (agent) {
            const skill = await db.skill.findFirst({
              where: { name: "command-parser" },
              select: { id: true },
            })
            if (skill) {
              await db.skillExecution.create({
                data: {
                  id: crypto.randomUUID(),
                  agentId: agent.id,
                  skillId: skill.id,
                  input: { command } as object,
                  output: { intent: parsed.intent, params: parsed.params } as object,
                  status: SkillExecutionStatus.COMPLETED,
                  duration: Date.now() - startedAt,
                  updatedAt: new Date(),
                },
              })
            }
          }
        } catch {
          // Non-critical — do not fail the request if logging errors
        }
      }

      return successResponse({
        intent: parsed.intent,
        parsed: parsed.params,
        ...(results !== undefined && {
          results: results.map((l) => ({
            id: l.id,
            title: l.title,
            price: l.price,
            currency: l.currency,
            category: l.category,
            condition: l.condition,
            address: l.address,
            status: l.status,
            publishedAt: l.publishedAt,
            images: l.ListingImage.map((img) => ({ url: img.url })),
          })),
        }),
        ...(redirectUrl !== undefined && { redirectUrl }),
      })
    } catch (error: unknown) {
      console.error("Command execute error:", error)

      if (error instanceof ZodError) {
        return errorResponse("Validation error", 400, { errors: error.errors })
      }

      return errorResponse(
        error instanceof Error ? error.message : "Failed to execute command",
        500
      )
    }
  },
})
