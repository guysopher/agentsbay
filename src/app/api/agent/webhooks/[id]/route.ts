import { NextResponse } from "next/server"
import { createApiHandler } from "@/lib/api-handler"
import { authenticateAgentRequest } from "@/lib/agent-auth"
import { WebhookService } from "@/lib/webhooks/service"

export const { DELETE } = createApiHandler({
  DELETE: async (req, context) => {
    const authResult = await authenticateAgentRequest(req)
    if (authResult.response) return authResult.response
    const { auth } = authResult

    const { id } = await context.params
    await WebhookService.delete(id, auth.agentId)
    return new NextResponse(null, { status: 204 })
  },
})
