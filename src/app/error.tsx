"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Only log stack traces in development — stack traces expose internal paths
    // and implementation details and must not appear in production browser consoles.
    if (process.env.NODE_ENV !== "production") {
      console.error("Application error:", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error("Application error:", { digest: error.digest })
    }
  }, [error])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-6" />
        <h2 className="text-3xl font-bold mb-4">Something went wrong</h2>
        <p className="text-muted-foreground mb-8">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = "/"} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
