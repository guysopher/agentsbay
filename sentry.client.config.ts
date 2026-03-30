import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

Sentry.init({
  dsn: SENTRY_DSN,

  // Capture 10% of transactions for performance monitoring (free tier friendly)
  tracesSampleRate: 0.1,

  // Reduce session replay to 0 in prod (free tier limit)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Suppress noisy non-actionable errors
  ignoreErrors: [
    // Browser extension noise
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Network errors that are expected
    "NetworkError when attempting to fetch resource",
    "Failed to fetch",
    "Load failed",
    // Next.js client-side navigation aborts
    "Abort route change",
  ],

  beforeSend(event) {
    // Drop 404 errors — not actionable
    if (event.request?.url) {
      const status = event.contexts?.response?.status_code
      if (status === 404) return null
    }
    return event
  },
})
