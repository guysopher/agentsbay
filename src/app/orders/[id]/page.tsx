import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderStatus, FulfillmentMethod } from "@prisma/client"
import { CheckCircle2, Circle, Clock, MapPin, Truck } from "lucide-react"
import { NotFoundError } from "@/lib/errors"
import { MarkAsPaidButton } from "@/components/orders/mark-paid-button"
import { SchedulePickupForm } from "@/components/orders/schedule-pickup-form"

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

// Status progression steps
const PICKUP_STEPS: OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PAID,
  OrderStatus.IN_TRANSIT,
  OrderStatus.COMPLETED,
]
const PICKUP_STEP_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting Payment",
  PAID: "Payment Confirmed",
  IN_TRANSIT: "Pickup Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "",
  DISPUTED: "",
  REFUNDED: "",
}

function StatusStep({
  label,
  done,
  active,
}: {
  label: string
  done: boolean
  active: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
      ) : active ? (
        <Clock className="h-5 w-5 text-blue-600 shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300 shrink-0" />
      )}
      <span
        className={`text-sm ${
          done ? "text-green-700 font-medium" : active ? "text-blue-700 font-medium" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    redirect("/auth/signin?callbackUrl=/orders")
  }

  const { id } = await params

  let order
  try {
    order = await OrderService.getById(id, userId)
  } catch (err) {
    if (err instanceof NotFoundError) {
      notFound()
    }
    throw err
  }

  const isBuyer = order.buyerId === userId
  const isPickup = order.fulfillmentMethod === FulfillmentMethod.PICKUP

  // Calculate progress step index — includes PENDING_PAYMENT as first step
  const currentStepIndex = PICKUP_STEPS.indexOf(order.status)

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground mb-6">
        <Link href="/orders" className="hover:text-foreground">My Orders</Link>
        {" / "}
        <span className="text-foreground">{order.Listing.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{order.Listing.title}</h1>
          <p className="text-muted-foreground text-sm">
            <Link href={`/listings/${order.Listing.id}`} className="underline hover:text-foreground">
              View listing
            </Link>
            {" · "}
            {isBuyer ? "You are the buyer" : "You are the seller"}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status]}>
          {STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {/* Order Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">{formatPrice(order.amount, order.Listing.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fulfillment</span>
            <span className="flex items-center gap-1">
              {isPickup ? (
                <><MapPin className="h-3.5 w-3.5" />Pickup</>
              ) : (
                <><Truck className="h-3.5 w-3.5" />Delivery</>
              )}
            </span>
          </div>
          {order.pickupLocation && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pickup location</span>
              <span>{order.pickupLocation}</span>
            </div>
          )}
          {order.deliveryAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery address</span>
              <span>{order.deliveryAddress}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(order.createdAt)}</span>
          </div>
          {order.completedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{formatDate(order.completedAt)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment instructions — shown to both buyer and seller until order is complete */}
      {(order.status === OrderStatus.PENDING_PAYMENT || order.status === OrderStatus.PAID) && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How payment works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              <li className="flex gap-3">
                <span className="shrink-0 font-semibold text-foreground">1.</span>
                <span>Agree on a payment method with the seller via messages (e.g. PayPal, bank transfer, cash)</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-semibold text-foreground">2.</span>
                <span>Complete the payment outside of AgentsBay</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-semibold text-foreground">3.</span>
                <span>Buyer marks the order as paid once payment is sent</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-semibold text-foreground">4.</span>
                <span>Seller confirms receipt and marks as paid on their end</span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 font-semibold text-foreground">5.</span>
                <span>Order is marked complete</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Pending Payment — buyer CTA */}
      {order.status === OrderStatus.PENDING_PAYMENT && isBuyer && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-amber-900">Payment Pending</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-800">
              Payment is arranged directly with the seller. Once payment is confirmed between you,
              click <strong>Mark as Paid</strong> to proceed with scheduling pickup.
            </p>
            <MarkAsPaidButton orderId={order.id} />
          </CardContent>
        </Card>
      )}

      {/* Status Timeline — only for pickup orders in active statuses */}
      {isPickup && currentStepIndex >= 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PICKUP_STEPS.map((step, i) => (
                <StatusStep
                  key={step}
                  label={PICKUP_STEP_LABELS[step]}
                  done={i < currentStepIndex}
                  active={i === currentStepIndex}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schedule Pickup — shown to the seller when order is PAID and fulfillment is PICKUP */}
      {isPickup && order.status === OrderStatus.PAID && !isBuyer && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-900">Schedule Pickup</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-800 mb-4">
              Payment confirmed. Enter the pickup location where the buyer can collect the item. The order will move to in transit once submitted.
            </p>
            <SchedulePickupForm orderId={order.id} />
          </CardContent>
        </Card>
      )}

      {/* Delivery info */}
      {!isPickup && order.DeliveryRequest && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span>{order.DeliveryRequest.status}</span>
            </div>
            {order.DeliveryRequest.trackingNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tracking</span>
                <span>{order.DeliveryRequest.trackingNumber}</span>
              </div>
            )}
            {order.DeliveryRequest.pickedUpAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Picked up</span>
                <span>{formatDate(order.DeliveryRequest.pickedUpAt)}</span>
              </div>
            )}
            {order.DeliveryRequest.deliveredAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivered</span>
                <span>{formatDate(order.DeliveryRequest.deliveredAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
