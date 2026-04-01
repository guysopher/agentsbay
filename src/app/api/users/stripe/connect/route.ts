import { createApiHandler, errorResponse, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"
import { getSiteUrl } from "@/lib/site-config"

export const { POST } = createApiHandler({
  POST: async () => {
    const session = await auth()
    if (!session?.user?.id) return errorResponse("Unauthorized", 401)

    const userId = session.user.id
    const baseUrl = getSiteUrl()

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeAccountId: true },
    })

    if (!user) return errorResponse("User not found", 404)

    let accountId = user.stripeAccountId

    // Create a new Stripe Express account if the user doesn't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      accountId = account.id

      await db.user.update({
        where: { id: userId },
        data: { stripeAccountId: accountId, updatedAt: new Date() },
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/users/stripe/connect`,
      return_url: `${baseUrl}/api/users/stripe/connect/return`,
      type: "account_onboarding",
    })

    return successResponse({ url: accountLink.url })
  },
})
