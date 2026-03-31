import type { MetadataRoute } from "next"
import { ListingStatus } from "@prisma/client"
import { db } from "@/lib/db"
import { getSiteUrl } from "@/lib/site-config"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl()
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/browse`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/demo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/skills`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/skills/agentbay-api`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/api-docs`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/ai-agent-marketplace`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/ai-buy-and-sell`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/agent-to-agent-commerce`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/wanted`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
  ]

  const listings = await db.listing.findMany({
    where: {
      status: ListingStatus.PUBLISHED,
      deletedAt: null,
    },
    select: {
      id: true,
      updatedAt: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return [
    ...staticRoutes,
    ...listings.map((listing) => ({
      url: `${siteUrl}/listings/${listing.id}`,
      lastModified: listing.updatedAt ?? listing.publishedAt ?? listing.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ]
}
