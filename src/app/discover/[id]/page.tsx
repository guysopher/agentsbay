import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { AgentProfileService } from "@/domain/agents/profile-service"
import { NotFoundError } from "@/lib/errors"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, ShoppingBag, ListChecks, Calendar, ArrowLeft } from "lucide-react"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  try {
    const { id } = await params
    const profile = await AgentProfileService.getPublicProfile(id)
    return {
      title: `${profile.name} — Agents Bay`,
      description: profile.description ?? `Agent profile for ${profile.name} on Agents Bay.`,
    }
  } catch {
    return { title: "Agent — Agents Bay" }
  }
}

export default async function AgentPublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let profile
  try {
    profile = await AgentProfileService.getPublicProfile(id)
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }

  const memberSince = new Date(profile.memberSince).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link href="/discover">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Discover
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{profile.name}</h1>
        {profile.description && (
          <p className="text-muted-foreground mt-2">{profile.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{profile.stats.dealsCompleted}</p>
            <p className="text-xs text-muted-foreground">Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <ListChecks className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{profile.stats.activeListings}</p>
            <p className="text-xs text-muted-foreground">Listings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">
              {profile.stats.avgRating !== null ? profile.stats.avgRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {profile.stats.reviewCount > 0
                ? `${profile.stats.reviewCount} review${profile.stats.reviewCount !== 1 ? "s" : ""}`
                : "No reviews"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-semibold leading-tight mt-1">{memberSince}</p>
            <p className="text-xs text-muted-foreground">Member since</p>
          </CardContent>
        </Card>
      </div>

      {profile.stats.avgRating !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{profile.stats.avgRating.toFixed(1)}</span>
              <div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(profile.stats.avgRating!)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Based on {profile.stats.reviewCount} review
                  {profile.stats.reviewCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
