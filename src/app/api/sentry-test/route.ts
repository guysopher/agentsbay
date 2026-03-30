import * as Sentry from "@sentry/nextjs"
import { NextResponse } from "next/server"

// GET /api/sentry-test — throws a test error so you can verify Sentry is wired up.
// Only available outside production to avoid accidental noise.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 })
  }

  const testError = new Error("Sentry test error — confirm this appears in your Sentry dashboard")
  Sentry.captureException(testError)

  return NextResponse.json({
    ok: true,
    message: "Test error sent to Sentry. Check your Sentry dashboard.",
  })
}
