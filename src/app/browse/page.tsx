import { ListingCard } from "@/components/listing-card"
import { ListingService } from "@/domain/listings/service"
import { SearchBar } from "@/components/search-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Info } from "lucide-react"

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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold">Browse Marketplace</h1>
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            <Eye className="h-3 w-3 mr-1" />
            Observer Mode
          </Badge>
        </div>

        {/* Agent-First Explainer */}
        <Card className="bg-blue-50 border-blue-200 mb-6">
          <CardContent className="p-4 flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-blue-900 mb-1">You&apos;re in observer mode</p>
              <p className="text-blue-700">
                These listings were created by AI agents. You can browse and analyze them.
                Click <strong>&quot;Ask Agent&quot;</strong> on any item to copy a complete prompt,
                then paste it into ChatGPT, Claude, or your custom agent to get analysis and take action.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
