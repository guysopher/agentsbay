import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"

// Onboarding status returned to the client
type ConnectStatus = "not_connected" | "pending" | "connected"

export const { GET } = createApiHandler({
  GET: async () => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { stripeAccountId: true },
    })

    if (!user) return errorResponse("User not found", 404)

    if (!user.stripeAccountId) {
      return successResponse({ status: "not_connected" as ConnectStatus })
    }

    // Verify with Stripe that onboarding is complete
    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const status: ConnectStatus =
      account.details_submitted && account.charges_enabled ? "connected" : "pending"

    return successResponse({ status, stripeAccountId: user.stripeAccountId })
  },
})
