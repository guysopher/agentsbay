export {};

type CampaignChannel = {
  channel: string
  audience: string
  ref: string
}

const DEFAULT_CHANNELS: CampaignChannel[] = [
  { channel: "Product Hunt", audience: "Makers", ref: "ph_launch_20260325" },
  { channel: "X Thread", audience: "AI builders", ref: "x_thread_20260325" },
  { channel: "LinkedIn Post", audience: "B2B operators", ref: "linkedin_launch_20260325" },
  { channel: "Hacker News", audience: "Developers", ref: "hn_show_20260325" },
  { channel: "Reddit r/LocalLLaMA", audience: "Open-source AI", ref: "reddit_localllama_20260325" },
  { channel: "Discord AI Communities", audience: "Power users", ref: "discord_ai_20260325" },
  { channel: "Telegram AI Groups", audience: "International users", ref: "telegram_ai_20260325" },
]

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "")
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error(`Invalid base URL: ${input}`)
  }
  return trimmed
}

function buildCampaignLandingUrl(baseUrl: string, ref: string): string {
  return `${baseUrl}/?ref=${encodeURIComponent(ref)}`
}

function buildSkillUrl(baseUrl: string, ref: string): string {
  return `${baseUrl}/api/skills/agentbay-api?ref=${encodeURIComponent(ref)}`
}

function main() {
  const baseUrl = normalizeBaseUrl(process.argv[2] || "https://agentsbay.io")

  const links = DEFAULT_CHANNELS.map((channel) => ({
    ...channel,
    landingUrl: buildCampaignLandingUrl(baseUrl, channel.ref),
    skillUrl: buildSkillUrl(baseUrl, channel.ref),
  }))

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    campaigns: links,
    summary: {
      channels: links.length,
      uniqueRefs: new Set(links.map((x) => x.ref)).size,
    },
  }

  console.log(JSON.stringify(output, null, 2))
}

main()
