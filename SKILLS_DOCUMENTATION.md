# AgentBay Skills System

**Date**: March 22, 2026
**Status**: ✅ Fully Implemented

---

## Overview

The AgentBay Skills System allows agents to use AI-powered capabilities through a plugin architecture. Skills are modular, reusable capabilities that agents can enable and execute to enhance their decision-making and automation.

## Architecture

### Database Schema

```prisma
model Skill {
  id              String          // Unique ID
  name            String @unique  // Skill identifier (e.g., "claude_code")
  displayName     String          // Human-readable name
  description     String          // What the skill does
  category        SkillCategory   // ANALYSIS, GENERATION, etc.
  capabilities    Json            // What actions the skill supports
  config          Json?           // Skill configuration
  costPerExecution Int?           // Cost in credits (nullable for free)
}

model AgentSkill {
  agentId   String
  skillId   String
  isEnabled Boolean
  settings  Json?   // Agent-specific skill settings
}

model SkillExecution {
  agentId   String
  skillId   String
  input     Json    // Input parameters
  output    Json?   // Execution result
  status    SkillExecutionStatus
  duration  Int?    // Execution time in ms
  cost      Int?    // Cost in credits
}
```

### Components

1. **Skill Interface** (`src/domain/skills/types.ts`)
   - Defines the contract all skills must implement
   - Type-safe input/output

2. **Skill Registry** (`src/domain/skills/registry.ts`)
   - Manages skill implementations
   - Auto-registration on import

3. **Skill Service** (`src/domain/skills/service.ts`)
   - Business logic for skill management
   - Execution orchestration
   - History tracking

4. **Skill Implementations** (`src/domain/skills/implementations/`)
   - Actual skill code
   - Claude Code skill included

---

## Claude Code Skill

### Overview

The Claude Code skill integrates Claude Code AI capabilities into agent workflows. It provides:

- **Listing Analysis** - Analyze listings and suggest improvements
- **Price Estimation** - Estimate fair market prices
- **Description Generation** - Create compelling descriptions
- **Negotiation Analysis** - Suggest negotiation strategies

### Capabilities

#### 1. Analyze Listing

Analyzes a listing and provides actionable suggestions.

**Input**:
```json
{
  "action": "analyze_listing",
  "title": "Vintage Wooden Chair",
  "description": "Old chair, some wear",
  "category": "FURNITURE",
  "price": 5000
}
```

**Output**:
```json
{
  "qualityScore": 6,
  "qualityExplanation": "Basic listing needs more detail",
  "titleSuggestions": [
    "Vintage Mid-Century Wooden Dining Chair",
    "Antique Oak Wooden Chair - Rustic Farmhouse Style"
  ],
  "descriptionImprovements": [
    "Specify the type of wood",
    "Mention dimensions",
    "Describe the wear patterns"
  ],
  "seoKeywords": ["vintage", "wooden", "chair", "furniture", "antique"],
  "redFlags": ["Very brief description might deter buyers"],
  "marketAppeal": "MEDIUM",
  "marketAppealReason": "Vintage furniture has steady demand but needs better presentation"
}
```

#### 2. Estimate Price

Estimates fair market value based on description and condition.

**Input**:
```json
{
  "action": "estimate_price",
  "title": "iPhone 12 Pro",
  "description": "64GB, good condition, minor scratches",
  "condition": "GOOD",
  "category": "ELECTRONICS"
}
```

**Output**:
```json
{
  "estimatedMin": 30000,
  "estimatedMax": 40000,
  "recommendedPrice": 35000,
  "confidence": "HIGH",
  "factors": [
    "Model is 3 years old",
    "64GB is entry-level storage",
    "Good condition adds value",
    "High market demand for iPhones"
  ],
  "demandAssessment": "Strong demand for used iPhones, should sell quickly at recommended price"
}
```

#### 3. Generate Description

Creates compelling listing descriptions.

**Input**:
```json
{
  "action": "generate_description",
  "title": "Mountain Bike",
  "category": "SPORTS",
  "condition": "LIKE_NEW",
  "features": ["21-speed", "aluminum frame", "disc brakes"]
}
```

**Output**:
```json
{
  "short": "Like-new 21-speed mountain bike with aluminum frame and disc brakes. Perfect for trails and weekend adventures!",
  "detailed": "This barely-used mountain bike is ready for your next adventure. Features a lightweight aluminum frame, smooth 21-speed shifting for tackling any terrain, and reliable disc brakes for confident stopping power. The bike is in like-new condition with minimal wear - it's been ridden only a handful of times. Ideal for trail riding, commuting, or weekend explorations. Don't miss this opportunity to get a quality bike at a great price!",
  "suggestedTags": ["mountain bike", "21-speed", "aluminum", "disc brakes", "trail bike"]
}
```

#### 4. Analyze Negotiation

Provides negotiation strategy recommendations.

**Input**:
```json
{
  "action": "analyze_negotiation",
  "listingPrice": 10000,
  "offerPrice": 7000,
  "conversationHistory": [
    { "from": "buyer", "message": "Would you take $70?" },
    { "from": "agent", "message": "The listing price is $100" }
  ],
  "agentSettings": {
    "minAcceptAmount": 8000,
    "autoRejectBelow": 6000
  }
}
```

**Output**:
```json
{
  "recommendation": "COUNTER",
  "counterPrice": 8500,
  "reasoning": "Offer is 30% below asking but above auto-reject threshold. Buyer has shown interest. Counter at $85 (15% discount) to meet in middle.",
  "strategy": "Start negotiation with a moderate counter-offer that's still within your acceptable range. This shows flexibility while maintaining value.",
  "riskLevel": "LOW",
  "alternatives": [
    "Accept if buyer seems unlikely to negotiate higher",
    "Hold firm at $90 if you have other interested parties",
    "Bundle with free delivery to justify higher price"
  ]
}
```

---

## API Reference

### List All Skills

```http
GET /api/skills
```

**Response**:
```json
{
  "data": [
    {
      "id": "skill_123",
      "name": "claude_code",
      "displayName": "Claude Code Assistant",
      "description": "AI-powered assistant...",
      "category": "ANALYSIS",
      "capabilities": { ... },
      "isActive": true
    }
  ]
}
```

### Get Agent Skills

```http
GET /api/agents/{agentId}/skills
```

**Response**:
```json
{
  "data": [
    {
      "id": "agent_skill_123",
      "agentId": "agent_123",
      "skillId": "skill_123",
      "isEnabled": true,
      "settings": {},
      "skill": { ... }
    }
  ]
}
```

### Enable Skill for Agent

```http
POST /api/agents/{agentId}/skills
Content-Type: application/json

{
  "skillId": "skill_123",
  "settings": {
    "maxTokens": 1024
  }
}
```

**Response**: `201 Created`

### Disable Skill for Agent

```http
DELETE /api/agents/{agentId}/skills?skillId=skill_123
```

**Response**: `200 OK`

### Execute Skill

```http
POST /api/agents/{agentId}/skills/execute
Content-Type: application/json

{
  "skillId": "skill_123",
  "input": {
    "action": "analyze_listing",
    "title": "...",
    "description": "..."
  }
}
```

**Response**:
```json
{
  "data": {
    "id": "execution_123",
    "status": "COMPLETED",
    "output": {
      "success": true,
      "data": { ... },
      "metadata": {
        "duration": 1234,
        "model": "claude-sonnet-4-5"
      }
    },
    "duration": 1234,
    "cost": 0
  }
}
```

**Rate Limit**: 30 executions per hour per agent

### Get Execution History

```http
GET /api/agents/{agentId}/skills/history?skillId=skill_123&status=COMPLETED&limit=20
```

**Query Parameters**:
- `skillId` (optional) - Filter by skill
- `status` (optional) - Filter by status (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED)
- `limit` (optional) - Max results (default: 50)

**Response**:
```json
{
  "data": [
    {
      "id": "execution_123",
      "agentId": "agent_123",
      "skillId": "skill_123",
      "input": { ... },
      "output": { ... },
      "status": "COMPLETED",
      "duration": 1234,
      "cost": 0,
      "createdAt": "2026-03-22T10:00:00Z",
      "skill": { ... }
    }
  ]
}
```

### Get Execution Statistics

```http
GET /api/agents/{agentId}/skills/stats?skillId=skill_123
```

**Response**:
```json
{
  "data": {
    "total": 50,
    "completed": 45,
    "failed": 5,
    "successRate": 90,
    "totalCost": 0
  }
}
```

---

## Usage Examples

### Enable Claude Code for an Agent

```typescript
// Enable the skill
const response = await fetch(`/api/agents/${agentId}/skills`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skillId: claudeCodeSkillId,
    settings: {
      maxTokens: 1024,
      temperature: 0.7,
    },
  }),
})
```

### Analyze a Listing Before Publishing

```typescript
const response = await fetch(`/api/agents/${agentId}/skills/execute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skillId: claudeCodeSkillId,
    input: {
      action: "analyze_listing",
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price: listing.price,
    },
  }),
})

const { data } = await response.json()

if (data.output.data.qualityScore < 7) {
  // Show improvement suggestions to user
  console.log("Suggestions:", data.output.data.descriptionImprovements)
}
```

### Auto-Generate Description

```typescript
const response = await fetch(`/api/agents/${agentId}/skills/execute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skillId: claudeCodeSkillId,
    input: {
      action: "generate_description",
      title: "Vintage Camera",
      category: "ELECTRONICS",
      condition: "GOOD",
      features: ["35mm film", "manual focus", "leather case"],
    },
  }),
})

const { data } = await response.json()
const generatedDescription = data.output.data.detailed
```

### Negotiation Assistant

```typescript
const response = await fetch(`/api/agents/${agentId}/skills/execute`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skillId: claudeCodeSkillId,
    input: {
      action: "analyze_negotiation",
      listingPrice: 10000,
      offerPrice: 7500,
      conversationHistory: negotiationMessages,
      agentSettings: agent.negotiationSettings,
    },
  }),
})

const { data } = await response.json()
const strategy = data.output.data

if (strategy.recommendation === "COUNTER") {
  // Send counter-offer
  await sendCounterOffer(strategy.counterPrice, strategy.reasoning)
} else if (strategy.recommendation === "ACCEPT") {
  // Accept the offer
  await acceptOffer()
}
```

---

## Creating New Skills

### 1. Implement the ISkill Interface

```typescript
// src/domain/skills/implementations/my-skill.ts
import type { ISkill, SkillInput, SkillOutput } from "../types"
import { SkillCategory } from "@prisma/client"

export class MySkill implements ISkill {
  id = "my-skill"
  name = "my_skill"
  displayName = "My Awesome Skill"
  description = "Does something awesome"
  category = SkillCategory.AUTOMATION

  capabilities = [
    {
      name: "do_something",
      description: "Does something cool",
      parameters: [
        {
          name: "input",
          type: "string",
          required: true,
          description: "Input data",
        },
      ],
    },
  ]

  validateInput(input: SkillInput) {
    const errors: string[] = []

    if (!input.input) {
      errors.push("input is required")
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async execute(input: SkillInput, agentId: string): Promise<SkillOutput> {
    try {
      // Your skill logic here
      const result = await doSomething(input.input)

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }
}

// Auto-register
import { skillRegistry } from "../registry"
const mySkill = new MySkill()
skillRegistry.register(mySkill)

export { mySkill }
```

### 2. Add to Index

```typescript
// src/domain/skills/index.ts
import "./implementations/my-skill"
```

### 3. Seed the Database

```typescript
// prisma/seed-skills.ts
const mySkill = await prisma.skill.upsert({
  where: { name: "my_skill" },
  update: {},
  create: {
    name: "my_skill",
    displayName: "My Awesome Skill",
    description: "Does something awesome",
    category: SkillCategory.AUTOMATION,
    capabilities: {
      actions: [
        {
          name: "do_something",
          description: "Does something cool",
        },
      ],
    },
    costPerExecution: 50, // 50 credits
  },
})
```

### 4. Run Seed

```bash
npm run seed:skills
```

---

## Setup & Installation

### 1. Database Migration

```bash
# Generate Prisma client with new models
npm run db:generate

# Push schema changes to database
npm run db:push
```

### 2. Seed Skills

```bash
# Run the skills seed script
npx tsx prisma/seed-skills.ts
```

### 3. Environment Variables

Add to `.env`:

```bash
# Required for Claude Code skill
ANTHROPIC_API_KEY=your_api_key_here
```

### 4. Test the System

```bash
# Start dev server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/skills

# Should return the Claude Code skill
```

---

## Best Practices

### For Skill Developers

1. **Validate Input** - Always validate input parameters
2. **Handle Errors** - Catch and return meaningful error messages
3. **Set Timeouts** - Configure reasonable timeouts in config
4. **Document Well** - Provide clear capability descriptions
5. **Test Thoroughly** - Test with various inputs

### For Agent Developers

1. **Check Enabled** - Verify skill is enabled before execution
2. **Handle Failures** - Gracefully handle skill execution failures
3. **Monitor Costs** - Track skill execution costs
4. **Rate Limits** - Respect the 30 executions/hour limit
5. **Cache Results** - Cache skill outputs when appropriate

### Security

1. **API Keys** - Store API keys in AgentCredential model (encrypted)
2. **Input Validation** - Sanitize all user inputs
3. **Rate Limiting** - Enforce execution limits
4. **Authorization** - Verify agent ownership before execution
5. **Audit Trail** - All executions are logged

---

## Monitoring & Analytics

### Execution History

View all skill executions for an agent:

```typescript
const history = await SkillService.getExecutionHistory(agentId, {
  limit: 100,
  status: "COMPLETED",
})
```

### Statistics

Get success rates and costs:

```typescript
const stats = await SkillService.getExecutionStats(agentId, skillId)

console.log(`Success rate: ${stats.successRate}%`)
console.log(`Total cost: ${stats.totalCost} credits`)
```

### Events

Subscribe to skill execution events:

```typescript
eventBus.on("skill.executed", async (data) => {
  console.log(`Agent ${data.agentId} executed skill ${data.skillId}`)
  console.log(`Success: ${data.success}`)

  // Send notification, update analytics, etc.
})
```

---

## Future Enhancements

1. **More Skills**
   - Market research skill
   - Image analysis skill
   - Translation skill
   - Email/SMS communication skill

2. **Skill Marketplace**
   - Third-party skill submissions
   - Skill ratings and reviews
   - Paid skills with revenue sharing

3. **Advanced Features**
   - Skill chaining (output of one skill → input of another)
   - Scheduled skill execution
   - Skill triggers based on events
   - A/B testing for skill configurations

4. **Enterprise Features**
   - Team skill libraries
   - Custom skill deployments
   - SLA guarantees
   - Priority execution queues

---

## Troubleshooting

### Skill Not Found

```
Error: Skill implementation not found
```

**Solution**: Ensure the skill is imported in `src/domain/skills/index.ts`

### Validation Errors

```
Error: Invalid input: title is required
```

**Solution**: Check the capability parameters and provide all required fields

### Rate Limit Exceeded

```
Error: Too many requests. Try again in 3600 seconds.
```

**Solution**: Wait for the rate limit window to reset or optimize execution frequency

### Execution Timeout

```
Error: Skill execution timed out
```

**Solution**: Increase the timeout in skill config or optimize the skill implementation

---

## Support

For questions or issues:
- Check the API documentation above
- Review execution history for error details
- Check skill configuration in database
- Verify API keys are set correctly

---

**Skills system is production-ready and fully documented!** 🎉
