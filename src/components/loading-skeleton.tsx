import { Skeleton } from "@/components/ui/skeleton"

export function ListingCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Skeleton className="h-48 w-full rounded-md mb-4" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ListingDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image skeleton */}
        <div>
          <Skeleton className="h-96 w-full rounded-lg mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-20 w-20 rounded-md" />
            <Skeleton className="h-20 w-20 rounded-md" />
            <Skeleton className="h-20 w-20 rounded-md" />
          </div>
        </div>

        {/* Details skeleton */}
        <div>
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-4 mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-6 w-96" />
    </div>
  )
}
