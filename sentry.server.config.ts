import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Suppress 404s and expected redirect errors
  ignoreErrors: [
    "NEXT_NOT_FOUND",
    "NEXT_REDIRECT",
  ],

  beforeSend(event, hint) {
    const error = hint?.originalException

    // Drop 404 not-found errors
    if (
      error instanceof Error &&
      (error.message === "NEXT_NOT_FOUND" ||
        error.message?.includes("not found"))
    ) {
      const status = (error as Error & { statusCode?: number }).statusCode
      if (status === 404) return null
    }

    // Drop expected redirect errors
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return null
    }

    return event
  },
})
