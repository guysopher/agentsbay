import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimiter, resolveRouteConfig } from "@/lib/rate-limit"

// Pages that require a NextAuth session — unauthenticated users are redirected
const PROTECTED_PAGES = ["/profile", "/dashboard", "/orders", "/listings/new"]

// API routes that are fully public — no credentials required
const PUBLIC_API_PREFIXES = [
  "/api/auth",    // NextAuth sign-in / callback / CSRF
  "/api/health",  // Health check / uptime monitoring
  "/api/skills",  // Public skill catalog (used by OpenAI / external agents)
]

// Individual paths that are public (exact or prefix match)
const PUBLIC_API_PATHS = [
  "/api/agent/register", // Agent self-registration — issues the API key
]

// Routes that use HTTP Bearer token auth (agent API key or cron secret).
// Middleware only checks header *presence*; full key validation happens in the handler.
// Note: trailing slash on /api/agent/ prevents matching /api/agents (session-protected).
const BEARER_AUTH_PREFIXES = [
  "/api/agent/",  // All agent API routes (sk_test_* keys)
  "/api/cron/",   // Cron triggers (CRON_SECRET)
]

// API routes where GET is publicly readable but mutations require a session.
// Listed explicitly so the intent is clear.
const PUBLIC_GET_PREFIXES = [
  "/api/listings", // Browse marketplace listings
  "/api/wanted",   // Browse wanted requests
]

function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )
  return response
}

function unauthorizedJson(message: string): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message } },
    { status: 401 }
  )
}

function applyRateLimit(
  req: NextRequest & { auth?: { user?: { id?: string } } | null }
): NextResponse | null {
  const { pathname } = req.nextUrl
  const config = resolveRouteConfig(req.method, pathname)
  if (!config) return null

  // Use userId for authenticated requests, IP for unauthenticated.
  //
  // IP trust model (Vercel deployment assumed):
  //   - x-real-ip is set by Vercel's edge infrastructure to the actual client IP
  //     and cannot be overridden by the client — trust it first.
  //   - x-forwarded-for is appended to by each proxy hop; we read the rightmost
  //     value (last entry), which is injected by the nearest trusted proxy rather
  //     than the client. The leftmost value (split(",")[0]) is client-controlled
  //     and must never be used for rate-limit keying.
  //   - For self-hosted / Docker deployments behind a known reverse proxy, ensure
  //     the proxy strips and rewrites x-forwarded-for before reaching Next.js.
  const userId = req.auth?.user?.id
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown"
  const key = userId ? `user:${userId}:${pathname}` : `ip:${ip}:${pathname}`

  const status = rateLimiter.checkSafe(key, config)

  const rateLimitHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(status.limit),
    "X-RateLimit-Remaining": String(status.remaining),
    "X-RateLimit-Reset": new Date(status.resetAt).toISOString(),
  }

  if (!status.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(status.retryAfter ?? 60),
          "Content-Type": "application/json",
        },
      }
    )
  }

  return null
}

// `auth` wraps the middleware and injects `req.auth` (NextAuth session | null)
export default auth((req: NextRequest & { auth?: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl
  const method = req.method

  // ── Rate limiting ────────────────────────────────────────────────────────────
  const rateLimitResponse = applyRateLimit(req)
  if (rateLimitResponse) return rateLimitResponse

  // ── API routes ──────────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    // 1. Fully public — pass through without any auth check
    if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return securityHeaders(NextResponse.next())
    }
    if (PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return securityHeaders(NextResponse.next())
    }

    // 2. Public GET — browsing is open; mutations fall through to session check below
    if (
      method === "GET" &&
      PUBLIC_GET_PREFIXES.some((p) => pathname.startsWith(p))
    ) {
      return securityHeaders(NextResponse.next())
    }

    // 3. Bearer token routes — verify header presence only; handler validates the key
    if (BEARER_AUTH_PREFIXES.some((p) => pathname.startsWith(p))) {
      const authHeader = req.headers.get("authorization")
      if (!authHeader?.startsWith("Bearer ")) {
        return unauthorizedJson("Missing Authorization header")
      }
      return securityHeaders(NextResponse.next())
    }

    // 4. Everything else requires a NextAuth session
    if (!req.auth) {
      return unauthorizedJson("Authentication required")
    }

    return securityHeaders(NextResponse.next())
  }

  // ── Page routes ─────────────────────────────────────────────────────────────
  const isProtectedPage = PROTECTED_PAGES.some((route) =>
    pathname.startsWith(route)
  )
  if (isProtectedPage && !req.auth) {
    const signInUrl = new URL("/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  return securityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    // Match everything except static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
}
