/**
 * In-memory request metrics singleton.
 * Tracks per-endpoint request counts, durations, error rates, and hourly error buckets.
 * Zero external dependencies — all data lives in-process.
 */

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

interface EndpointMetrics {
  totalRequests: number
  totalDuration: number
  errors: number
  // status code → count
  statusCodes: Record<number, number>
}

interface HourlyBucket {
  requests: number
  errors: number
}

export interface MetricsSummary {
  uptime: number
  requestCount: number
  errorRate: number
  topEndpoints: Array<{
    endpoint: string
    requests: number
    avgDuration: number
    errorRate: number
  }>
  hourlyErrors: Array<{
    hour: string
    requests: number
    errors: number
  }>
}

class RequestMetrics {
  private readonly startedAt: number
  private readonly endpoints: Map<string, EndpointMetrics>
  // key: ISO hour string "YYYY-MM-DDTHH" (UTC)
  private readonly hourlyBuckets: Map<string, HourlyBucket>

  constructor() {
    this.startedAt = Date.now()
    this.endpoints = new Map()
    this.hourlyBuckets = new Map()
  }

  /** Normalize a URL path: replace UUIDs with :id */
  private normalizePath(path: string): string {
    return path.replace(UUID_RE, ":id")
  }

  /** Current ISO hour key in UTC, e.g. "2026-03-29T10" */
  private hourKey(date = new Date()): string {
    return date.toISOString().slice(0, 13)
  }

  /** Prune hourly buckets older than 24 hours */
  private pruneHourlyBuckets(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const cutoffKey = this.hourKey(cutoff)
    for (const key of this.hourlyBuckets.keys()) {
      if (key < cutoffKey) {
        this.hourlyBuckets.delete(key)
      }
    }
  }

  /**
   * Record a completed request.
   * @param method  HTTP method ("GET", "POST", etc.)
   * @param path    URL pathname (will be normalized)
   * @param status  HTTP status code
   * @param duration  Response time in milliseconds
   */
  record(method: string, path: string, status: number, duration: number): void {
    const endpoint = `${method.toUpperCase()} ${this.normalizePath(path)}`
    const isError = status >= 400

    // Update per-endpoint metrics
    const existing = this.endpoints.get(endpoint) ?? {
      totalRequests: 0,
      totalDuration: 0,
      errors: 0,
      statusCodes: {},
    }
    existing.totalRequests += 1
    existing.totalDuration += duration
    if (isError) existing.errors += 1
    existing.statusCodes[status] = (existing.statusCodes[status] ?? 0) + 1
    this.endpoints.set(endpoint, existing)

    // Update hourly bucket
    const key = this.hourKey()
    const bucket = this.hourlyBuckets.get(key) ?? { requests: 0, errors: 0 }
    bucket.requests += 1
    if (isError) bucket.errors += 1
    this.hourlyBuckets.set(key, bucket)

    // Auto-prune stale hourly buckets
    this.pruneHourlyBuckets()
  }

  /** Server uptime in seconds */
  getUptime(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000)
  }

  /** Total requests recorded since process start */
  getRequestCount(): number {
    let total = 0
    for (const m of this.endpoints.values()) {
      total += m.totalRequests
    }
    return total
  }

  /** Overall error rate (0–1) across all endpoints */
  getErrorRate(): number {
    let totalRequests = 0
    let totalErrors = 0
    for (const m of this.endpoints.values()) {
      totalRequests += m.totalRequests
      totalErrors += m.errors
    }
    return totalRequests > 0 ? totalErrors / totalRequests : 0
  }

  /** Full metrics summary for the admin dashboard */
  getSummary(): MetricsSummary {
    const uptime = this.getUptime()
    const requestCount = this.getRequestCount()
    const errorRate = this.getErrorRate()

    // Top 10 endpoints by request count
    const topEndpoints = Array.from(this.endpoints.entries())
      .sort((a, b) => b[1].totalRequests - a[1].totalRequests)
      .slice(0, 10)
      .map(([endpoint, m]) => ({
        endpoint,
        requests: m.totalRequests,
        avgDuration:
          m.totalRequests > 0 ? Math.round(m.totalDuration / m.totalRequests) : 0,
        errorRate: m.totalRequests > 0 ? m.errors / m.totalRequests : 0,
      }))

    // Hourly buckets sorted oldest → newest
    const hourlyErrors = Array.from(this.hourlyBuckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([hour, bucket]) => ({
        hour,
        requests: bucket.requests,
        errors: bucket.errors,
      }))

    return { uptime, requestCount, errorRate, topEndpoints, hourlyErrors }
  }
}

export const requestMetrics = new RequestMetrics()
