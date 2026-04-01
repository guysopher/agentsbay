import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { ListingService } from "@/domain/listings/service"
import { MyListingCard } from "@/components/my-listing-card"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ListingStatus } from "@prisma/client"
import { Plus } from "lucide-react"

export const metadata: Metadata = {
  title: "My Listings",
  robots: { index: false, follow: false },
}

type TabValue = "all" | "draft" | "published" | "paused" | "sold" | "removed"

const TABS: { value: TabValue; label: string; status?: ListingStatus }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft", status: ListingStatus.DRAFT },
  { value: "published", label: "Published", status: ListingStatus.PUBLISHED },
  { value: "paused", label: "Paused", status: ListingStatus.PAUSED },
  { value: "sold", label: "Sold", status: ListingStatus.SOLD },
  { value: "removed", label: "Removed", status: ListingStatus.REMOVED },
]

const EMPTY_MESSAGES: Record<TabValue, { message: string; showCta: boolean }> = {
  all: { message: "You haven't created any listings yet.", showCta: true },
  draft: { message: "No draft listings.", showCta: false },
  published: { message: "No published listings.", showCta: true },
  paused: { message: "No paused listings.", showCta: false },
  sold: { message: "No sold listings.", showCta: false },
  removed: { message: "No removed listings.", showCta: false },
}

async function MyListingsList({
  userId,
  tab,
  cursor,
}: {
  userId: string
  tab: TabValue
  cursor?: string
}) {
  const statusFilter = TABS.find((t) => t.value === tab)?.status
  const { items, nextCursor, hasMore } = await ListingService.getUserListings(userId, {
    status: statusFilter,
    cursor,
    limit: 20,
  })

  if (items.length === 0) {
    const { message, showCta } = EMPTY_MESSAGES[tab]
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg mb-2">{message}</p>
        {showCta && (
          <p className="text-sm">
            <Link href="/listings/new" className="underline hover:text-foreground">
              Create a listing
            </Link>{" "}
            to start selling.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-3">
        {items.map((listing) => (
          <MyListingCard key={listing.id} listing={listing as Parameters<typeof MyListingCard>[0]["listing"]} />
        ))}
      </div>
      {hasMore && nextCursor && (
        <div className="mt-6 text-center">
          <Button asChild variant="outline">
            <Link href={`/listings?tab=${tab}&cursor=${nextCursor}`}>Load more</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function MyListingsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <Skeleton className="w-16 h-16 rounded-md" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; cursor?: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/listings")
  }

  const { tab: tabParam, cursor } = await searchParams
  const activeTab: TabValue =
    tabParam === "draft" ||
    tabParam === "published" ||
    tabParam === "paused" ||
    tabParam === "sold" ||
    tabParam === "removed"
      ? tabParam
      : "all"

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">My Listings</h1>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link href="/listings/new">
            <Plus className="h-4 w-4 mr-1" />
            Create Listing
          </Link>
        </Button>
      </div>

      <div className="flex gap-2 text-sm mb-6 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/listings?tab=${t.value}`}
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              activeTab === t.value ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Suspense fallback={<MyListingsSkeleton />}>
        <MyListingsList userId={userId} tab={activeTab} cursor={cursor} />
      </Suspense>
    </div>
  )
}
