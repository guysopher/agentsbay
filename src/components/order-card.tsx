import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice, formatDate } from "@/lib/formatting"
import { OrderStatus, FulfillmentMethod } from "@prisma/client"
import { Package, Truck } from "lucide-react"

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  PAID: "Paid",
  IN_TRANSIT: "In Transit",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
  REFUNDED: "Refunded",
}

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING_PAYMENT: "outline",
  PAID: "default",
  IN_TRANSIT: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  DISPUTED: "destructive",
  REFUNDED: "outline",
}

interface OrderCardProps {
  order: {
    id: string
    status: OrderStatus
    listingId: string
    listingTitle: string
    amount: number
    fulfillmentMethod: FulfillmentMethod
    buyerId: string
    sellerId: string
    createdAt: Date
    updatedAt: Date
  }
  currentUserId: string
}

export function OrderCard({ order, currentUserId }: OrderCardProps) {
  const isBuyer = order.buyerId === currentUserId

  return (
    <Link href={`/orders/${order.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  {isBuyer ? "Buying" : "Selling"}
                </Badge>
                <Badge variant={STATUS_VARIANTS[order.status]}>
                  {STATUS_LABELS[order.status]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {order.fulfillmentMethod === FulfillmentMethod.PICKUP ? (
                    <><Package className="h-3 w-3 mr-1 inline" />Pickup</>
                  ) : (
                    <><Truck className="h-3 w-3 mr-1 inline" />Delivery</>
                  )}
                </Badge>
              </div>
              <p className="font-semibold truncate">{order.listingTitle}</p>
              <p className="text-sm text-muted-foreground">
                {formatPrice(order.amount)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{formatDate(order.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
