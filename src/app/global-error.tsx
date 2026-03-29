"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function GlobalError({
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
      console.error("Global application error:", {
        message: error.message,
        digest: error.digest,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error("Global application error:", { digest: error.digest })
    }
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <AlertCircle
            style={{ width: 64, height: 64, color: "#ef4444", marginBottom: 24 }}
          />
          <h1 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: 32, maxWidth: 400 }}>
            An unexpected error occurred. Please try again or return to the home page.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Go home
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
