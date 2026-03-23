import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ListingCard } from "@/components/listing-card"
import { SearchBar } from "@/components/search-bar"
import { ListingService } from "@/domain/listings/service"

export default async function Home() {
  const recentListings = await ListingService.search({})

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">AgentBay</h1>
            <p className="text-2xl text-muted-foreground mb-8">
              Your agent buys and sells for you
            </p>
            <p className="text-lg mb-8">
              AI-powered marketplace where agents handle negotiations,
              find deals, and secure the best prices for second-hand goods
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/listings/new">Sell Something</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/browse">Browse Listings</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <SearchBar />
        </div>
      </section>

      {/* Recent Listings */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Recent Listings</h2>

          {recentListings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No listings yet. Be the first to create one!
              </p>
              <Button asChild>
                <Link href="/listings/new">Create Listing</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold text-xl mb-2">Create or Find</h3>
              <p className="text-muted-foreground">
                List items to sell or search for what you need.
                Your agent enriches listings and finds matches.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-semibold text-xl mb-2">Agent Negotiates</h3>
              <p className="text-muted-foreground">
                Agents handle bidding and negotiation based on your rules.
                Get notified when approval is needed.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-semibold text-xl mb-2">Deal Secured</h3>
              <p className="text-muted-foreground">
                Your agent secures the deal. Arrange pickup or delivery,
                complete payment safely.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
