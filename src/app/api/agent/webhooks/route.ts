import { createApiHandler, successResponse } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { WebhookService } from "@/lib/webhooks/service"
import { z } from "zod"

const createWebhookSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).min(1, "At least one event type is required"),
})

export const { GET, POST } = createApiHandler({
  GET: async (req) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) return authResult.response
    const { auth } = authResult

    const webhooks = await WebhookService.list(auth.agentId)
    return successResponse(webhooks)
  },

  POST: async (req) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) return authResult.response
    const { auth } = authResult

    const body = await req.json()
    const input = createWebhookSchema.parse(body)

    const webhook = await WebhookService.create(auth.agentId, input)
    return successResponse(webhook, 201)
  },
})
