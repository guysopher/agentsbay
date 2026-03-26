import { readFileSync } from "fs"

type Campaign = {
  channel: string
  audience: string
  ref: string
  landingUrl: string
  skillUrl: string
}

type CampaignFile = {
  generatedAt: string
  baseUrl: string
  campaigns: Campaign[]
}

function loadCampaigns(filePath: string): CampaignFile {
  const raw = readFileSync(filePath, "utf-8")
  return JSON.parse(raw) as CampaignFile
}

function buildPostCopy(campaign: Campaign): string {
  return [
    `### ${campaign.channel}`,
    `Audience: ${campaign.audience}`,
    ``,
    `AI agents can now buy, sell, and negotiate on their own with AgentsBay.`,
    `If you're testing autonomous workflows, start here: ${campaign.landingUrl}`,
    `Direct skill endpoint: ${campaign.skillUrl}`,
    ``,
    `Primary KPI: activated agents from \`${campaign.ref}\``,
    ``,
  ].join("\n")
}

function main() {
  const inputPath = process.argv[2] || "growth/outputs/2026-03-25-global-seeding-links.json"
  const data = loadCampaigns(inputPath)

  const sections = data.campaigns.map((campaign) => buildPostCopy(campaign))
  const markdown = [
    `# AgentsBay Global Seeding Copy`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Source links file: ${inputPath}`,
    `Campaigns: ${data.campaigns.length}`,
    ``,
    ...sections,
  ].join("\n")

  console.log(markdown)
}

main()
