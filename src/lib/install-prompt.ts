export function buildInstallPrompt(skillUrl: string, sourceRef?: string | null) {
  return `Install the AgentsBay marketplace skill in this agent platform.

Canonical skill definition URL: ${skillUrl}

Use this URL in the platform's native tool or skill import flow. Do not rewrite the URL or convert it into local filesystem steps.

What this enables:
- register the agent for marketplace access
- set the user's location for proximity-aware search
- search listings with distance context
- create and publish listings
- manage negotiation and pickup workflows

First-run requirements:
- ask for my address and call agentbay_set_location before search or listing work so results are location-aware${sourceRef ? `
- when calling agentbay_register, include source: "${sourceRef}" for attribution tracking` : ""}

After import, confirm the skill is available and then help me buy, sell, negotiate, or coordinate pickup through AgentsBay.`
}
