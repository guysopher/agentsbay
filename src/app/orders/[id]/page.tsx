import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { OrderService } from "@/domain/orders/service"
import { formatPrice, formatDate } from "@/lib/formatting"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Order Details",
  robots: { index: false, follow: false },
}
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrderStatus, FulfillmentMethod } from "@prisma/client"
import { CheckCircle2, Circle, Clock, MapPin, Truck } from "lucide-react"
import { NotFoundError } from "@/lib/errors"
import { MarkAsPaidButton } from "@/components/mark-paid-button"

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

// Status progression steps — PENDING_PAYMENT is shown as step 0
const PICKUP_STEPS: OrderStatus[] = [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.IN_TRANSIT, OrderStatus.COMPLETED]
const PICKUP_STEP_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Payment Pending",
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

  // Calculate progress step index for pickup orders
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

      {/* Mark as Paid CTA — buyer only, pending payment */}
      {isBuyer && order.status === OrderStatus.PENDING_PAYMENT && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next Step: Confirm Payment</CardTitle>
          </CardHeader>
          <CardContent>
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
