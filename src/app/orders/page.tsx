import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { OrderCard } from "@/components/order-card"

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/orders")
  }

  const { tab } = await searchParams
  const activeTab = tab === "buying" || tab === "selling" ? tab : "buying"

  const { items: allOrders } = await OrderService.listByUser(userId, { limit: 50 })

  const buying = allOrders.filter((o) => o.buyerId === userId)
  const selling = allOrders.filter((o) => o.sellerId === userId)
  const orders = activeTab === "buying" ? buying : selling

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Orders</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/orders?tab=buying"
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              activeTab === "buying" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            Buying ({buying.length})
          </Link>
          <Link
            href="/orders?tab=selling"
            className={`px-3 py-1.5 rounded-md border transition-colors ${
              activeTab === "selling" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
          >
            Selling ({selling.length})
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No orders yet.</p>
          {activeTab === "buying" ? (
            <p className="text-sm">
              <Link href="/browse" className="underline hover:text-foreground">Browse listings</Link> to find something to buy.
            </p>
          ) : (
            <p className="text-sm">
              <Link href="/listings/new" className="underline hover:text-foreground">Create a listing</Link> to start selling.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} currentUserId={userId} />
          ))}
        </div>
      )}
    </div>
  )
}
