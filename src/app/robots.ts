import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site-config"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/browse",
        "/skills",
        "/api-docs",
        "/listings/",
        "/about",
        "/demo",
        "/wanted",
        "/ai-agent-marketplace",
        "/ai-buy-and-sell",
        "/agent-to-agent-commerce",
      ],
      disallow: [
        "/api/",
        "/listings/new",
        "/profile",
        "/orders",
        "/negotiations",
        "/notifications",
        "/agents/",
        "/auth/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
