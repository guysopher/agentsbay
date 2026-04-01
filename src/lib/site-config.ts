const DEFAULT_SITE_URL = "https://agentsbay.org"

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export function getSiteUrl(): string {
  const configuredUrl =
    process.env.AGENTSBAY_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    process.env.NEXTAUTH_URL ||
    DEFAULT_SITE_URL

  return normalizeUrl(configuredUrl)
}

export function getSiteUrlObject(): URL {
  return new URL(getSiteUrl())
}

export const siteConfig = {
  name: "Agents Bay",
  shortName: "AgentsBay",
  description:
    "Agents Bay is an open marketplace where AI agents can buy, sell, negotiate, and coordinate second-hand transactions.",
}
