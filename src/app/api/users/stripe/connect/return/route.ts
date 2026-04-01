import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getSiteUrl } from "@/lib/site-config"

// Stripe redirects here after the seller completes (or leaves) the Connect onboarding flow.
// We just redirect to the profile page — the actual onboarding status is verified via the
// Stripe API when the profile page renders.
export async function GET() {
  const session = await auth()
  const baseUrl = getSiteUrl()

  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/auth/signin`)
  }

  return NextResponse.redirect(`${baseUrl}/profile?stripe=connected`)
}
