// Simple in-memory rate limiter (for Phase 5, replace with Redis)
import { RateLimitError } from "./errors"

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

export interface RateLimitStatus {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter?: number
}

// Default for all agent routes not matched by a specific rule below
export const DEFAULT_AGENT_RATE_LIMIT: RateLimitConfig = { maxRequests: 60, windowMs: 60_000 }

/**
 * Resolve the rate limit config for a given method + pathname.
 * Returns null when no limit applies (e.g., non-agent routes or test env).
 */
export function resolveRouteConfig(
  method: string,
  pathname: string
): RateLimitConfig | null {
  // Disable rate limiting in test environment
  if (process.env.NODE_ENV === "test") return null

  // Only rate limit API routes
  if (!pathname.startsWith("/api/")) return null

  // Walk rules in order — first match wins (more specific rules come first)
  // Special-case: POST /api/agent/listings/search vs POST /api/agent/listings
  // and POST /api/agent/listings/:id/bids vs POST /api/agent/listings
  // The ROUTE_RATE_LIMITS array is ordered from most-specific to least-specific.
  // But because both POST listings rules share prefix we need explicit path logic:

  if (pathname === "/api/agent/listings/search" && method === "GET") {
    return { maxRequests: 30, windowMs: 60_000 }
  }

  if (pathname.includes("/bids") && method === "POST") {
    return { maxRequests: 20, windowMs: 60_000 }
  }

  if (pathname === "/api/agent/listings" && method === "POST") {
    return { maxRequests: 10, windowMs: 60_000 }
  }

  if (pathname.startsWith("/api/auth/")) {
    return { maxRequests: 5, windowMs: 60_000 }
  }

  // Agent registration: strict 5/hour to prevent account creation abuse
  if (pathname === "/api/agent/register") {
    return { maxRequests: 5, windowMs: 60 * 60 * 1000 }
  }

  // All other agent routes
  if (pathname.startsWith("/api/agent/") || pathname.startsWith("/api/agents/")) {
    return DEFAULT_AGENT_RATE_LIMIT
  }

  // Public GET endpoints — 60 req/min per IP to prevent bulk scraping
  if (
    method === "GET" &&
    ["/api/listings", "/api/wanted"].some((p) => pathname.startsWith(p))
  ) {
    return { maxRequests: 60, windowMs: 60_000 }
  }

  return null
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start periodic cleanup — runs every 60 seconds, removes expired entries
    if (typeof setInterval !== "undefined") {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of this.store.entries()) {
          if (now > entry.resetAt) {
            this.store.delete(key)
          }
        }
      }, 60_000)

      // Allow Node.js to exit even if timer is active
      if (this.cleanupTimer?.unref) {
        this.cleanupTimer.unref()
      }
    }
  }

  /**
   * Check and increment the counter for a key.
   * Returns the rate limit status without throwing.
   */
  checkSafe(key: string, config: RateLimitConfig): RateLimitStatus {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + config.windowMs })
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetAt: now + config.windowMs,
      }
    }

    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        resetAt: entry.resetAt,
        retryAfter,
      }
    }

    entry.count++
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Check if a request should be rate limited.
   * Throws RateLimitError when the limit is exceeded.
   */
  async check(key: string, config: RateLimitConfig): Promise<boolean> {
    const status = this.checkSafe(key, config)

    if (!status.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${status.retryAfter} seconds.`,
        {
          limit: status.limit,
          remaining: 0,
          resetAt: new Date(status.resetAt).toISOString(),
          retryAfter: status.retryAfter,
        }
      )
    }

    return true
  }

  /**
   * Get current rate limit status for a key without consuming a slot.
   */
  getStatus(key: string, config: RateLimitConfig) {
    const now = Date.now()
    const entry = this.store.get(key)

    if (!entry || now > entry.resetAt) {
      return {
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      }
    }

    return {
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for a key (useful for testing).
   */
  reset(key: string) {
    this.store.delete(key)
  }

  /**
   * Clear all rate limits (useful for testing).
   */
  clear() {
    this.store.clear()
  }

  /**
   * Stop the background cleanup timer (useful for testing).
   */
  destroy() {
    if (this.cleanupTimer !== null) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()

// Export class for testing
export { RateLimiter }

// Common rate limit configurations
export const RATE_LIMITS = {
  // Per hour
  LISTING_CREATE: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
  BID_CREATE: { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  THREAD_CREATE: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
  WANTED_CREATE: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
  AGENT_CREATE: { maxRequests: 5, windowMs: 60 * 60 * 1000 },

  // Per minute (for API endpoints)
  API_DEFAULT: { maxRequests: 60, windowMs: 60 * 1000 },
  API_STRICT: { maxRequests: 10, windowMs: 60 * 1000 },
} as const
