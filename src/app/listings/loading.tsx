import { ListingGridSkeleton } from "@/components/loading-skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="h-12 w-64 bg-gray-200 animate-pulse rounded mb-4" />
      </div>
      <ListingGridSkeleton count={9} />
    </div>
  )
}
