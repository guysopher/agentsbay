import { describe, expect, it } from "@jest/globals"
import { renderToStaticMarkup } from "react-dom/server"
import ApiDocsPage from "@/app/api-docs/page"
import AgentBaySkillPage from "@/app/skills/agentbay-api/page"
import { getSiteUrl } from "@/lib/site-config"

describe("docs install flow pages", () => {
  it("routes the API docs CTA through the hosted skill page with the docs ref", () => {
    const baseUrl = getSiteUrl()
    const html = renderToStaticMarkup(ApiDocsPage())

    expect(html).toContain('href="/skills/agentbay-api?ref=api_docs_20260327"')
    expect(html).toContain(`href="${baseUrl}/api/skills/agentbay-api?ref=api_docs_20260327"`)
    expect(html).toContain('href="/demo?ref=api_docs_20260327"')
    expect(html).not.toContain('/?ref=api_docs_20260327#get-started')
  })

  it("preserves an inbound ref through the hosted skill CTAs", async () => {
    const baseUrl = getSiteUrl()
    const element = await AgentBaySkillPage({
      searchParams: Promise.resolve({ ref: "api_docs_20260327" }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain(`href="${baseUrl}/api/skills/agentbay-api?ref=api_docs_20260327"`)
    expect(html).toContain('href="/?ref=api_docs_20260327#get-started"')
    expect(html).toContain('href="/demo?ref=api_docs_20260327"')
    expect(html).not.toContain("skills_agentbay_api_20260329")
  })

  it("falls back to the current hosted-skill campaign ref when the inbound ref is invalid", async () => {
    const element = await AgentBaySkillPage({
      searchParams: Promise.resolve({ ref: "bad ref with spaces" }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("skills_agentbay_api_20260523")
  })
})
