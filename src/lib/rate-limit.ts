// Simple in-memory rate limiter (for Phase 5, replace with Redis)
import { RateLimitError } from "./errors"

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()

  /**
   * Check if a request should be rate limited
   * @param key - Unique identifier (e.g., userId, IP address)
   * @param config - Rate limit configuration
   * @returns true if request is allowed, throws RateLimitError if not
   */
  async check(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now()
    const entry = this.store.get(key)

    // Clean up expired entries periodically
    this.cleanup(now)

    // No existing entry, create new one
    if (!entry) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      })
      return true
    }

    // Reset window has passed, create new entry
    if (now > entry.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      })
      return true
    }

    // Within window, check limit
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      throw new RateLimitError(
        `Too many requests. Try again in ${retryAfter} seconds.`
      )
    }

    // Increment count
    entry.count++
    return true
  }

  /**
   * Get current rate limit status for a key
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
   * Clean up expired entries
   */
  private cleanup(now: number) {
    // Only clean up occasionally to avoid performance impact
    if (Math.random() > 0.1) return

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Reset rate limit for a key (useful for testing)
   */
  reset(key: string) {
    this.store.delete(key)
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clear() {
    this.store.clear()
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
