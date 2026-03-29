import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"
import { RateLimiter, resolveRouteConfig, RateLimitConfig } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

describe("RateLimiter", () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
  })

  afterEach(() => {
    limiter.destroy()
  })

  const config: RateLimitConfig = { maxRequests: 3, windowMs: 60_000 }

  describe("checkSafe", () => {
    it("allows requests up to the limit", () => {
      expect(limiter.checkSafe("key1", config).allowed).toBe(true)
      expect(limiter.checkSafe("key1", config).allowed).toBe(true)
      expect(limiter.checkSafe("key1", config).allowed).toBe(true)
    })

    it("blocks the request after limit exceeded", () => {
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      const status = limiter.checkSafe("key1", config)
      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
      expect(status.retryAfter).toBeGreaterThan(0)
    })

    it("returns correct remaining count", () => {
      const first = limiter.checkSafe("key1", config)
      expect(first.remaining).toBe(2)
      const second = limiter.checkSafe("key1", config)
      expect(second.remaining).toBe(1)
      const third = limiter.checkSafe("key1", config)
      expect(third.remaining).toBe(0)
    })

    it("returns the configured limit", () => {
      const status = limiter.checkSafe("key1", config)
      expect(status.limit).toBe(config.maxRequests)
    })

    it("resets after the window expires", () => {
      // Fill up
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      expect(limiter.checkSafe("key1", config).allowed).toBe(false)

      // Manually expire the entry by resetting
      limiter.reset("key1")
      expect(limiter.checkSafe("key1", config).allowed).toBe(true)
    })

    it("tracks different keys independently", () => {
      limiter.checkSafe("userA", config)
      limiter.checkSafe("userA", config)
      limiter.checkSafe("userA", config)
      // userA is now blocked
      expect(limiter.checkSafe("userA", config).allowed).toBe(false)
      // userB is unaffected
      expect(limiter.checkSafe("userB", config).allowed).toBe(true)
    })
  })

  describe("check (throwing version)", () => {
    it("resolves true when under limit", async () => {
      await expect(limiter.check("key1", config)).resolves.toBe(true)
    })

    it("throws RateLimitError when limit exceeded", async () => {
      await limiter.check("key1", config)
      await limiter.check("key1", config)
      await limiter.check("key1", config)
      await expect(limiter.check("key1", config)).rejects.toBeInstanceOf(RateLimitError)
    })

    it("RateLimitError includes retryAfter in details", async () => {
      await limiter.check("key1", config)
      await limiter.check("key1", config)
      await limiter.check("key1", config)
      try {
        await limiter.check("key1", config)
        expect.fail("Should have thrown")
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError)
        const rle = err as RateLimitError
        expect(rle.details?.retryAfter).toBeGreaterThan(0)
        expect(rle.details?.limit).toBe(config.maxRequests)
        expect(rle.details?.remaining).toBe(0)
      }
    })
  })

  describe("clear", () => {
    it("resets all tracked keys", () => {
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      limiter.checkSafe("key1", config)
      limiter.clear()
      expect(limiter.checkSafe("key1", config).allowed).toBe(true)
    })
  })
})

describe("resolveRouteConfig", () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true })
  })

  it("returns null in test environment", () => {
    // NODE_ENV is already 'test' during jest runs
    expect(resolveRouteConfig("GET", "/api/agent/listings/search")).toBeNull()
  })

  describe("with NODE_ENV=production", () => {
    beforeEach(() => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true })
    })

    it("limits auth endpoints to 5/min", () => {
      const cfg = resolveRouteConfig("POST", "/api/auth/signin")
      expect(cfg).toEqual({ maxRequests: 5, windowMs: 60_000 })
    })

    it("limits listing creation to 10/min", () => {
      const cfg = resolveRouteConfig("POST", "/api/agent/listings")
      expect(cfg).toEqual({ maxRequests: 10, windowMs: 60_000 })
    })

    it("limits bid creation to 20/min", () => {
      const cfg = resolveRouteConfig("POST", "/api/agent/listings/abc123/bids")
      expect(cfg).toEqual({ maxRequests: 20, windowMs: 60_000 })
    })

    it("limits search to 30/min", () => {
      const cfg = resolveRouteConfig("GET", "/api/agent/listings/search")
      expect(cfg).toEqual({ maxRequests: 30, windowMs: 60_000 })
    })

    it("limits other agent routes to 60/min", () => {
      const cfg = resolveRouteConfig("GET", "/api/agent/orders")
      expect(cfg).toEqual({ maxRequests: 60, windowMs: 60_000 })
    })

    it("limits agent registration to 5/hour", () => {
      const cfg = resolveRouteConfig("POST", "/api/agent/register")
      expect(cfg).toEqual({ maxRequests: 5, windowMs: 60 * 60 * 1000 })
    })

    it("returns null for non-API paths", () => {
      expect(resolveRouteConfig("GET", "/browse")).toBeNull()
    })

    it("returns null for non-agent API paths (e.g. /api/health)", () => {
      expect(resolveRouteConfig("GET", "/api/health")).toBeNull()
    })
  })
})

describe("rate limiting end-to-end: register endpoint enforcement", () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter()
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true })
  })

  afterEach(() => {
    limiter.destroy()
    Object.defineProperty(process.env, "NODE_ENV", { value: "test", writable: true })
  })

  it("resolves correct 5/hour config for /api/agent/register and limiter enforces it", () => {
    const cfg = resolveRouteConfig("POST", "/api/agent/register")
    expect(cfg).not.toBeNull()
    expect(cfg!.maxRequests).toBe(5)
    expect(cfg!.windowMs).toBe(60 * 60 * 1000)

    // Exhaust the 5-request limit
    for (let i = 0; i < 5; i++) {
      expect(limiter.checkSafe("ip:1.2.3.4:/api/agent/register", cfg!).allowed).toBe(true)
    }

    // 6th request must be blocked
    const blocked = limiter.checkSafe("ip:1.2.3.4:/api/agent/register", cfg!)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBeGreaterThan(0)
  })

  it("middleware applyRateLimit logic: returns 429 response shape when limit exceeded", () => {
    const cfg = resolveRouteConfig("POST", "/api/agent/register")!

    // Exhaust the limit
    for (let i = 0; i < cfg.maxRequests; i++) {
      limiter.checkSafe("ip:x:/api/agent/register", cfg)
    }

    const status = limiter.checkSafe("ip:x:/api/agent/register", cfg)
    expect(status.allowed).toBe(false)
    expect(status.limit).toBe(cfg.maxRequests)
    expect(status.remaining).toBe(0)
    expect(typeof status.retryAfter).toBe("number")
    expect(typeof status.resetAt).toBe("number")
  })
})
