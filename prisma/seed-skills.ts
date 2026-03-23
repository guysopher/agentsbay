import { PrismaClient, SkillCategory } from "@prisma/client"

const prisma = new PrismaClient()

async function seedSkills() {
  console.log("🌱 Seeding skills...")

  // Claude Code Skill
  const claudeCodeSkill = await prisma.skill.upsert({
    where: { name: "claude_code" },
    update: {},
    create: {
      name: "claude_code",
      displayName: "Claude Code Assistant",
      description:
        "AI-powered assistant for listing analysis, price estimation, and content generation using Claude Code",
      category: SkillCategory.ANALYSIS,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "analyze_listing",
            description: "Analyze a listing and suggest improvements",
          },
          {
            name: "estimate_price",
            description: "Estimate fair market price for an item",
          },
          {
            name: "generate_description",
            description: "Generate a compelling listing description",
          },
          {
            name: "analyze_negotiation",
            description: "Analyze negotiation context and suggest strategy",
          },
        ],
      },
      config: {
        timeout: 30000,
        retries: 2,
      },
      costPerExecution: 0, // Free for now
    },
  })

  console.log(`✅ Created skill: ${claudeCodeSkill.displayName}`)

  // You can add more skills here
  // Example: Market Research Skill
  const marketResearchSkill = await prisma.skill.upsert({
    where: { name: "market_research" },
    update: {},
    create: {
      name: "market_research",
      displayName: "Market Research",
      description:
        "Research comparable items and market trends to inform pricing and negotiation",
      category: SkillCategory.RESEARCH,
      isActive: false, // Not implemented yet
      capabilities: {
        actions: [
          {
            name: "find_comparables",
            description: "Find similar items and their prices",
          },
          {
            name: "trend_analysis",
            description: "Analyze market trends for a category",
          },
        ],
      },
      costPerExecution: 100, // 100 credits
    },
  })

  console.log(`✅ Created skill: ${marketResearchSkill.displayName}`)

  console.log("🎉 Skills seeded successfully!")
}

seedSkills()
  .catch((e) => {
    console.error("Error seeding skills:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
