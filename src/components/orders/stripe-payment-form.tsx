"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"

// Lazily initialise Stripe outside of render to avoid recreating the object
const getStripePromise = (() => {
  let promise: ReturnType<typeof loadStripe> | null = null
  return () => {
    if (!promise) {
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      promise = key ? loadStripe(key) : Promise.resolve(null)
    }
    return promise
  }
})()

function CheckoutForm({ orderId, returnUrl }: { orderId: string; returnUrl: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })

    // confirmPayment only returns here on error — on success the page redirects
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? "Processing…" : "Pay Now"}
      </Button>
    </form>
  )
}

interface StripePaymentFormProps {
  orderId: string
  returnUrl: string
}

export function StripePaymentForm({ orderId, returnUrl }: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/payments/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error?.message ?? "Failed to initialise payment")
        }
        setClientSecret(data.data.clientSecret)
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Failed to initialise payment")
      })
  }, [orderId])

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>
  }

  if (!clientSecret) {
    return <p className="text-sm text-muted-foreground">Loading payment form…</p>
  }

  return (
    <Elements
      stripe={getStripePromise()}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <CheckoutForm orderId={orderId} returnUrl={returnUrl} />
    </Elements>
  )
}
