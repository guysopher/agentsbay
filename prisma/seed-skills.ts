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

  // Auto-Negotiator Skill
  const autoNegotiatorSkill = await prisma.skill.upsert({
    where: { name: "auto_negotiator" },
    update: {},
    create: {
      name: "auto_negotiator",
      displayName: "Auto Negotiator",
      description:
        "Automatically negotiate deals within predefined parameters and strategies",
      category: SkillCategory.NEGOTIATION,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "counter_offer",
            description: "Generate strategic counter-offers based on market data",
          },
          {
            name: "auto_accept",
            description: "Automatically accept offers within acceptable range",
          },
          {
            name: "rejection_strategy",
            description: "Politely reject unfavorable offers with explanation",
          },
        ],
      },
      config: {
        maxIterations: 5,
        minAcceptablePrice: 0.7, // 70% of asking price
      },
      costPerExecution: 50,
    },
  })

  console.log(`✅ Created skill: ${autoNegotiatorSkill.displayName}`)

  // Smart Messaging Skill
  const smartMessagingSkill = await prisma.skill.upsert({
    where: { name: "smart_messaging" },
    update: {},
    create: {
      name: "smart_messaging",
      displayName: "Smart Messaging",
      description:
        "Generate professional and persuasive messages for buyers and sellers",
      category: SkillCategory.COMMUNICATION,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "buyer_inquiry",
            description: "Generate professional buyer inquiry messages",
          },
          {
            name: "seller_response",
            description: "Create helpful responses to buyer questions",
          },
          {
            name: "follow_up",
            description: "Send automated follow-up messages",
          },
        ],
      },
      costPerExecution: 0,
    },
  })

  console.log(`✅ Created skill: ${smartMessagingSkill.displayName}`)

  // Listing Optimizer Skill
  const listingOptimizerSkill = await prisma.skill.upsert({
    where: { name: "listing_optimizer" },
    update: {},
    create: {
      name: "listing_optimizer",
      displayName: "Listing Optimizer",
      description:
        "Automatically improve listings with better titles, descriptions, and pricing",
      category: SkillCategory.GENERATION,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "optimize_title",
            description: "Create SEO-friendly and attention-grabbing titles",
          },
          {
            name: "enhance_description",
            description: "Expand descriptions with relevant details",
          },
          {
            name: "suggest_tags",
            description: "Recommend relevant tags and categories",
          },
          {
            name: "image_analysis",
            description: "Analyze images and suggest improvements",
          },
        ],
      },
      config: {
        maxTitleLength: 80,
        descriptionStyle: "professional",
      },
      costPerExecution: 25,
    },
  })

  console.log(`✅ Created skill: ${listingOptimizerSkill.displayName}`)

  // Deal Finder Skill
  const dealFinderSkill = await prisma.skill.upsert({
    where: { name: "deal_finder" },
    update: {},
    create: {
      name: "deal_finder",
      displayName: "Deal Finder",
      description:
        "Automatically search for underpriced items matching your criteria",
      category: SkillCategory.AUTOMATION,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "scan_listings",
            description: "Continuously scan new listings for deals",
          },
          {
            name: "price_alert",
            description: "Alert when items drop below target price",
          },
          {
            name: "auto_bid",
            description: "Automatically place bids on qualifying deals",
          },
        ],
      },
      config: {
        scanInterval: 300000, // 5 minutes
        maxBids: 10,
      },
      costPerExecution: 75,
    },
  })

  console.log(`✅ Created skill: ${dealFinderSkill.displayName}`)

  // Fraud Detection Skill
  const fraudDetectionSkill = await prisma.skill.upsert({
    where: { name: "fraud_detection" },
    update: {},
    create: {
      name: "fraud_detection",
      displayName: "Fraud Detection",
      description:
        "Analyze listings and user behavior to identify potential scams and fraud",
      category: SkillCategory.ANALYSIS,
      isActive: true,
      capabilities: {
        actions: [
          {
            name: "analyze_listing",
            description: "Check listing for fraud indicators",
          },
          {
            name: "seller_verification",
            description: "Verify seller reputation and history",
          },
          {
            name: "image_verification",
            description: "Detect stock photos or stolen images",
          },
          {
            name: "price_anomaly",
            description: "Identify suspiciously low prices",
          },
        ],
      },
      costPerExecution: 0, // Free for security
    },
  })

  console.log(`✅ Created skill: ${fraudDetectionSkill.displayName}`)

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
