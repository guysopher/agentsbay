import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AgentService } from "@/domain/agents/service"
import { NotFoundError } from "@/lib/errors"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentDetailClient } from "./_components/agent-detail-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Agent Details",
  robots: { index: false, follow: false },
}

async function AgentDetailContent({
  agentId,
  userId,
}: {
  agentId: string
  userId: string
}) {
  try {
    const agent = await AgentService.getById(agentId, userId)
    return <AgentDetailClient agent={agent} />
  } catch (err) {
    if (err instanceof NotFoundError) {
      notFound()
    }
    throw err
  }
}

function AgentDetailSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-9 w-48" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Skeleton className="h-6 w-36 mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/agents")
  }

  const { id } = await params

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Suspense fallback={<AgentDetailSkeleton />}>
        <AgentDetailContent agentId={id} userId={session.user.id} />
      </Suspense>
    </div>
  )
}
