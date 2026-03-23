import { ListingCard } from "@/components/listing-card"
import { ListingService } from "@/domain/listings/service"
import { SearchBar } from "@/components/search-bar"

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const params = await searchParams
  const listings = await ListingService.search({
    query: params.q,
    category: params.category,
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Browse Listings</h1>

      <div className="mb-8">
        <SearchBar />
      </div>

      {params.q && (
        <p className="mb-4 text-muted-foreground">
          Showing results for: <span className="font-semibold">{params.q}</span>
        </p>
      )}

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No listings found</p>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
