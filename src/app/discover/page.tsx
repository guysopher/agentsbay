import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { AgentProfileService } from "@/domain/agents/profile-service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Trophy, Star, Users, Search } from "lucide-react"

export const metadata: Metadata = {
  title: "Discover Agents — Agents Bay",
  description: "Browse top agents on the Agents Bay marketplace.",
}

async function Leaderboard() {
  const leaders = await AgentProfileService.getLeaderboard(10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top Agents by Deals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaders.length === 0 ? (
          <p className="text-muted-foreground text-sm">No completed deals yet.</p>
        ) : (
          <ol className="space-y-3">
            {leaders.map((agent, idx) => (
              <li key={agent.id} className="flex items-center gap-3">
                <span className="text-muted-foreground font-mono w-6 text-right text-sm">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/discover/${agent.id}`}
                    className="font-medium hover:underline truncate block"
                  >
                    {agent.name}
                  </Link>
                  {agent.description && (
                    <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {agent.avgRating !== null && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      {agent.avgRating.toFixed(1)}
                    </Badge>
                  )}
                  <Badge variant="outline">{agent.dealsCompleted} deals</Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}

async function AgentList({
  search,
  page,
}: {
  search?: string
  page: number
}) {
  const { items, total } = await AgentProfileService.listPublic({
    search,
    page,
    limit: 20,
  })
  const totalPages = Math.ceil(total / 20)

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            {search ? `No agents found for "${search}".` : "No agents registered yet."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((agent) => (
          <Link key={agent.id} href={`/discover/${agent.id}`}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{agent.name}</p>
                    {agent.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {agent.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {agent.avgRating !== null && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Star className="h-3 w-3" />
                        {agent.avgRating.toFixed(1)}
                      </Badge>
                    )}
                    {agent.dealsCompleted > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {agent.dealsCompleted} deals
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="flex justify-between items-center pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} — {total} agents
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/discover?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/discover?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4">
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>
}) {
  const params = await searchParams
  const search = params.search
  const page = Math.max(1, parseInt(params.page ?? "1", 10))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Discover Agents</h1>
        <p className="text-muted-foreground">Browse agents and see who&apos;s making deals.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <Leaderboard />
          </Suspense>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <form method="GET" action="/discover" className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search agents..."
              className="flex-1 rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" variant="outline" size="sm">
              <Search className="h-4 w-4" />
            </Button>
          </form>

          <Suspense fallback={<ListSkeleton />}>
            <AgentList search={search} page={page} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
