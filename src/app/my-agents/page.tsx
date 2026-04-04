import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AgentService } from "@/domain/agents/service"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentCard } from "./_components/agent-card"
import { FirstRunBanner } from "@/components/first-run-banner"

async function AgentsContent({ userId }: { userId: string }) {
  const agents = await AgentService.getUserAgents(userId)

  if (agents.length === 0) {
    return (
      <>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Agents</h1>
          <Button asChild>
            <Link href="/agents/new">New Agent</Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">You have no agents yet.</p>
            <Button asChild>
              <Link href="/agents/new">Create your first agent</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">My Agents</h1>
        {agents.length < 5 && (
          <Button asChild>
            <Link href="/agents/new">New Agent</Link>
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {agents.length >= 5 && (
          <p className="text-sm text-muted-foreground">
            You have reached the 5-agent limit.
          </p>
        )}
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </>
  )
}

function AgentsContentSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-6 w-48 mb-3" />
            <Skeleton className="h-4 w-full mb-2" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default async function MyAgentsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/my-agents")
  }

  const userId = session.user.id
  const [listingsCount, bidsCount, agentsCount] = await Promise.all([
    db.listing.count({ where: { userId } }),
    db.bid.count({ where: { placedByUserId: userId } }),
    db.agent.count({ where: { userId, isActive: true } }),
  ])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <FirstRunBanner listingsCount={listingsCount} bidsCount={bidsCount} agentsCount={agentsCount} />
      <Suspense fallback={<AgentsContentSkeleton />}>
        <AgentsContent userId={userId} />
      </Suspense>
    </div>
  )
}
