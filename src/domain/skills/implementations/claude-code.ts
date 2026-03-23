import type {
  ISkill,
  SkillInput,
  SkillOutput,
  SkillCapability,
} from "../types"
import { SkillCategory } from "@prisma/client"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Claude Code Skill
 *
 * Provides AI-powered capabilities using Claude Code for:
 * - Analyzing item descriptions and suggesting improvements
 * - Estimating fair market prices based on description
 * - Generating compelling listing descriptions
 * - Analyzing negotiation context and suggesting strategies
 * - Code analysis for technical items
 */
export class ClaudeCodeSkill implements ISkill {
  id = "claude-code-skill"
  name = "claude_code"
  displayName = "Claude Code Assistant"
  description =
    "AI-powered assistant for listing analysis, price estimation, and content generation"
  category = SkillCategory.ANALYSIS

  capabilities: SkillCapability[] = [
    {
      name: "analyze_listing",
      description: "Analyze a listing and suggest improvements",
      parameters: [
        {
          name: "title",
          type: "string",
          required: true,
          description: "Listing title",
        },
        {
          name: "description",
          type: "string",
          required: true,
          description: "Listing description",
        },
        {
          name: "category",
          type: "string",
          required: true,
          description: "Item category",
        },
        {
          name: "price",
          type: "number",
          required: false,
          description: "Current price in cents",
        },
      ],
    },
    {
      name: "estimate_price",
      description: "Estimate fair market price for an item",
      parameters: [
        {
          name: "title",
          type: "string",
          required: true,
          description: "Item title",
        },
        {
          name: "description",
          type: "string",
          required: true,
          description: "Item description",
        },
        {
          name: "condition",
          type: "string",
          required: true,
          description: "Item condition (NEW, LIKE_NEW, GOOD, FAIR, POOR)",
        },
        {
          name: "category",
          type: "string",
          required: true,
          description: "Item category",
        },
      ],
    },
    {
      name: "generate_description",
      description: "Generate a compelling listing description",
      parameters: [
        {
          name: "title",
          type: "string",
          required: true,
          description: "Item title",
        },
        {
          name: "category",
          type: "string",
          required: true,
          description: "Item category",
        },
        {
          name: "condition",
          type: "string",
          required: true,
          description: "Item condition",
        },
        {
          name: "features",
          type: "array",
          required: false,
          description: "Key features or details about the item",
        },
      ],
    },
    {
      name: "analyze_negotiation",
      description: "Analyze negotiation context and suggest strategy",
      parameters: [
        {
          name: "listingPrice",
          type: "number",
          required: true,
          description: "Listing price in cents",
        },
        {
          name: "offerPrice",
          type: "number",
          required: true,
          description: "Offer price in cents",
        },
        {
          name: "conversationHistory",
          type: "array",
          required: false,
          description: "Previous negotiation messages",
        },
        {
          name: "agentSettings",
          type: "object",
          required: false,
          description: "Agent negotiation settings",
        },
      ],
    },
  ]

  config = {
    timeout: 30000, // 30 seconds
    retries: 2,
  }

  private anthropic: Anthropic

  constructor() {
    // Initialize Anthropic client
    // In production, this would use agent-specific API key from AgentCredential
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    })
  }

  validateInput(input: SkillInput): { valid: boolean; errors?: string[] } {
    const errors: string[] = []

    if (!input.action) {
      errors.push("action is required")
    }

    const validActions = [
      "analyze_listing",
      "estimate_price",
      "generate_description",
      "analyze_negotiation",
    ]

    if (input.action && !validActions.includes(input.action)) {
      errors.push(`action must be one of: ${validActions.join(", ")}`)
    }

    // Action-specific validation
    switch (input.action) {
      case "analyze_listing":
      case "estimate_price":
        if (!input.title) errors.push("title is required")
        if (!input.description) errors.push("description is required")
        if (!input.category) errors.push("category is required")
        break

      case "generate_description":
        if (!input.title) errors.push("title is required")
        if (!input.category) errors.push("category is required")
        if (!input.condition) errors.push("condition is required")
        break

      case "analyze_negotiation":
        if (typeof input.listingPrice !== "number")
          errors.push("listingPrice is required")
        if (typeof input.offerPrice !== "number")
          errors.push("offerPrice is required")
        break
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async execute(input: SkillInput, agentId: string): Promise<SkillOutput> {
    const startTime = Date.now()

    try {
      let result: any

      switch (input.action) {
        case "analyze_listing":
          result = await this.analyzeListing(input)
          break

        case "estimate_price":
          result = await this.estimatePrice(input)
          break

        case "generate_description":
          result = await this.generateDescription(input)
          break

        case "analyze_negotiation":
          result = await this.analyzeNegotiation(input)
          break

        default:
          throw new Error(`Unknown action: ${input.action}`)
      }

      const duration = Date.now() - startTime

      return {
        success: true,
        data: result,
        metadata: {
          duration,
          model: "claude-sonnet-4-5",
        },
      }
    } catch (error) {
      const duration = Date.now() - startTime

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          duration,
        },
      }
    }
  }

  private async analyzeListing(input: SkillInput) {
    const prompt = `Analyze this marketplace listing and provide actionable suggestions:

Title: ${input.title}
Description: ${input.description}
Category: ${input.category}
${input.price ? `Current Price: $${input.price / 100}` : ""}

Please provide:
1. Quality score (1-10) with explanation
2. Title suggestions (if current title could be improved)
3. Description improvements (specific suggestions)
4. SEO keywords that should be included
5. Red flags or concerns (if any)
6. Estimated market appeal (HIGH, MEDIUM, LOW)

Format your response as JSON with these fields:
{
  "qualityScore": number,
  "qualityExplanation": string,
  "titleSuggestions": string[],
  "descriptionImprovements": string[],
  "seoKeywords": string[],
  "redFlags": string[],
  "marketAppeal": "HIGH" | "MEDIUM" | "LOW",
  "marketAppealReason": string
}`

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    // Parse JSON response
    try {
      return JSON.parse(responseText)
    } catch {
      // If not JSON, return as text
      return { analysis: responseText }
    }
  }

  private async estimatePrice(input: SkillInput) {
    const prompt = `Estimate a fair market price for this item:

Title: ${input.title}
Description: ${input.description}
Condition: ${input.condition}
Category: ${input.category}

Provide a price estimate with:
1. Estimated price range (min and max)
2. Recommended listing price
3. Factors affecting the price
4. Market demand assessment

Format as JSON:
{
  "estimatedMin": number (in cents),
  "estimatedMax": number (in cents),
  "recommendedPrice": number (in cents),
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "factors": string[],
  "demandAssessment": string
}`

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    try {
      return JSON.parse(responseText)
    } catch {
      return { estimate: responseText }
    }
  }

  private async generateDescription(input: SkillInput) {
    const featuresText = input.features
      ? `\nKey Features: ${input.features.join(", ")}`
      : ""

    const prompt = `Generate a compelling marketplace listing description:

Title: ${input.title}
Category: ${input.category}
Condition: ${input.condition}${featuresText}

Create a description that:
1. Is engaging and highlights key benefits
2. Is honest about the condition
3. Includes relevant details buyers care about
4. Is optimized for search
5. Has a clear call-to-action

Provide both a short version (2-3 sentences) and a detailed version (1-2 paragraphs).

Format as JSON:
{
  "short": string,
  "detailed": string,
  "suggestedTags": string[]
}`

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    try {
      return JSON.parse(responseText)
    } catch {
      return { description: responseText }
    }
  }

  private async analyzeNegotiation(input: SkillInput) {
    const listingPrice = input.listingPrice / 100
    const offerPrice = input.offerPrice / 100
    const priceDiff = ((listingPrice - offerPrice) / listingPrice) * 100

    const conversationContext = input.conversationHistory
      ? `\nConversation History:\n${JSON.stringify(input.conversationHistory, null, 2)}`
      : ""

    const prompt = `Analyze this negotiation and suggest a strategy:

Listing Price: $${listingPrice}
Offer Price: $${offerPrice}
Difference: ${priceDiff.toFixed(1)}%${conversationContext}

Agent Settings:
${JSON.stringify(input.agentSettings || {}, null, 2)}

Provide:
1. Should we accept, reject, or counter?
2. If counter, what price?
3. Negotiation strategy and reasoning
4. Risk assessment
5. Alternative approaches

Format as JSON:
{
  "recommendation": "ACCEPT" | "REJECT" | "COUNTER",
  "counterPrice": number | null (in cents),
  "reasoning": string,
  "strategy": string,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "alternatives": string[]
}`

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    try {
      return JSON.parse(responseText)
    } catch {
      return { strategy: responseText }
    }
  }
}

// Auto-register the skill
import { skillRegistry } from "../registry"
const claudeCodeSkill = new ClaudeCodeSkill()
skillRegistry.register(claudeCodeSkill)

export { claudeCodeSkill }
