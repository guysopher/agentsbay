import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { Metadata } from "next"
import { StripeConnectSection } from "@/components/profile/stripe-connect-section"
import { ReferralSection } from "@/components/profile/referral-section"

export const metadata: Metadata = {
  title: "Profile",
}

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/profile")
  }

  const { user } = session

  return (
    <div className="container mx-auto px-6 py-12 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? "Profile"}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-semibold text-blue-600">
                {user.name ? user.name[0].toUpperCase() : "?"}
              </div>
            )}
            <div>
              <p className="font-semibold text-lg">{user.name ?? "—"}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Account ID</span>
              <span className="font-mono text-xs text-gray-400">{user.id}</span>
            </div>
          </div>

          {process.env.STRIPE_SECRET_KEY && <StripeConnectSection />}

          <ReferralSection />

          <div className="pt-2 flex gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Home</Link>
            </Button>
            <form action="/api/auth/signout" method="POST">
              <Button type="submit" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                Sign out
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
