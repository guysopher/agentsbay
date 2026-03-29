import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { isAdmin } from "@/lib/admin-auth"
import { AnalyticsService } from "@/domain/analytics/service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Users, ShoppingBag, List, MessageSquare, Tag } from "lucide-react"

export const metadata: Metadata = {
  title: "Analytics — Admin — Agents Bay",
  robots: { index: false, follow: false },
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: "Furniture",
  ELECTRONICS: "Electronics",
  CLOTHING: "Clothing",
  BOOKS: "Books",
  SPORTS: "Sports",
  TOYS: "Toys",
  TOOLS: "Tools",
  HOME_GARDEN: "Home & Garden",
  VEHICLES: "Vehicles",
  OTHER: "Other",
}

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "Published",
  DRAFT: "Draft",
  PAUSED: "Paused",
  SOLD: "Sold",
  REMOVED: "Removed",
}

async function AnalyticsDashboard() {
  const metrics = await AnalyticsService.getPlatformMetrics()
  const activeListings = metrics.listings.byStatus["PUBLISHED"] ?? 0

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.agents.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics.agents.newThisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Listings
            </CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeListings}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.listings.total} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deals Completed
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.deals.total}</p>
            <p className="text-xs text-muted-foreground mt-1">
              +{metrics.deals.thisWeek} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Negotiation Rounds
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {metrics.negotiations.avgRoundsPerDeal !== null
                ? metrics.negotiations.avgRoundsPerDeal
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per completed deal</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            ) : (
              <ol className="space-y-2">
                {metrics.topCategories.map((cat, idx) => (
                  <li key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-sm w-4">{idx + 1}.</span>
                      <span className="text-sm font-medium">
                        {CATEGORY_LABELS[cat.category] ?? cat.category}
                      </span>
                    </div>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Listings by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(metrics.listings.byStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(metrics.listings.byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <Badge variant="outline">{count}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default async function AdminAnalyticsPage() {
  const session = await auth()
  if (!session?.user?.id || !isAdmin(session.user.id)) {
    redirect("/")
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="text-muted-foreground mt-1">Usage metrics and marketplace health.</p>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  )
}
