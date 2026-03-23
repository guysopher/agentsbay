import { ListingGridSkeleton, PageHeaderSkeleton } from "@/components/loading-skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeaderSkeleton />
      <ListingGridSkeleton count={6} />
    </div>
  )
}
