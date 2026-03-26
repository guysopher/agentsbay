# Claude Code Skill - Quick Start Guide

Get started with the Claude Code skill in 5 minutes!

---

## Prerequisites

```bash
# 1. Install dependencies (once npm install works)
npm install

# 2. Set up environment
cp .env.example .env

# 3. Add your Anthropic API key to .env
ANTHROPIC_API_KEY=your_api_key_here
```

---

## Setup

### 1. Update Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes
npm run db:push

# Seed skills
npx tsx prisma/seed-skills.ts
```

### 2. Start Server

```bash
npm run dev
```

---

## Quick Examples

### 1. List Available Skills

```bash
curl http://localhost:3000/api/skills
```

### 2. Enable Claude Code for Your Agent

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/skills \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "CLAUDE_CODE_SKILL_ID",
    "settings": {}
  }'
```

### 3. Analyze a Listing

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/execute \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "CLAUDE_CODE_SKILL_ID",
    "input": {
      "action": "analyze_listing",
      "title": "Vintage Wooden Chair",
      "description": "Old chair, some wear",
      "category": "FURNITURE",
      "price": 5000
    }
  }'
```

### 4. Estimate Price

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/execute \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "CLAUDE_CODE_SKILL_ID",
    "input": {
      "action": "estimate_price",
      "title": "iPhone 12 Pro",
      "description": "64GB, good condition, minor scratches",
      "condition": "GOOD",
      "category": "ELECTRONICS"
    }
  }'
```

### 5. Generate Description

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/execute \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "CLAUDE_CODE_SKILL_ID",
    "input": {
      "action": "generate_description",
      "title": "Mountain Bike",
      "category": "SPORTS",
      "condition": "LIKE_NEW",
      "features": ["21-speed", "aluminum frame", "disc brakes"]
    }
  }'
```

### 6. Get Negotiation Advice

```bash
curl -X POST http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/execute \
  -H "Content-Type: application/json" \
  -d '{
    "skillId": "CLAUDE_CODE_SKILL_ID",
    "input": {
      "action": "analyze_negotiation",
      "listingPrice": 10000,
      "offerPrice": 7000,
      "agentSettings": {
        "minAcceptAmount": 8000,
        "autoRejectBelow": 6000
      }
    }
  }'
```

---

## Using in Your Code

### React/TypeScript Example

```typescript
import { useState } from "react"

function ListingAnalyzer({ agentId, listing }) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyzeListing = async () => {
    setLoading(true)

    try {
      const response = await fetch(
        `/api/agents/${agentId}/skills/execute`,
        {
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
        }
      )

      const { data } = await response.json()
      setAnalysis(data.output.data)
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={analyzeListing} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Listing"}
      </button>

      {analysis && (
        <div>
          <h3>Quality Score: {analysis.qualityScore}/10</h3>
          <p>{analysis.qualityExplanation}</p>

          {analysis.titleSuggestions.length > 0 && (
            <div>
              <h4>Title Suggestions:</h4>
              <ul>
                {analysis.titleSuggestions.map((suggestion, i) => (
                  <li key={i}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.descriptionImprovements.length > 0 && (
            <div>
              <h4>Improvements:</h4>
              <ul>
                {analysis.descriptionImprovements.map((improvement, i) => (
                  <li key={i}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Skill Actions Reference

### 1. analyze_listing
**Purpose**: Get quality score and improvement suggestions

**Required Fields**:
- `title` (string)
- `description` (string)
- `category` (string)

**Optional Fields**:
- `price` (number in cents)

**Returns**:
- `qualityScore` (1-10)
- `qualityExplanation`
- `titleSuggestions[]`
- `descriptionImprovements[]`
- `seoKeywords[]`
- `redFlags[]`
- `marketAppeal` (HIGH/MEDIUM/LOW)

---

### 2. estimate_price
**Purpose**: Get fair market price estimate

**Required Fields**:
- `title` (string)
- `description` (string)
- `condition` (NEW/LIKE_NEW/GOOD/FAIR/POOR)
- `category` (string)

**Returns**:
- `estimatedMin` (cents)
- `estimatedMax` (cents)
- `recommendedPrice` (cents)
- `confidence` (HIGH/MEDIUM/LOW)
- `factors[]`
- `demandAssessment`

---

### 3. generate_description
**Purpose**: Create compelling listing text

**Required Fields**:
- `title` (string)
- `category` (string)
- `condition` (string)

**Optional Fields**:
- `features[]` (array of strings)

**Returns**:
- `short` (2-3 sentences)
- `detailed` (1-2 paragraphs)
- `suggestedTags[]`

---

### 4. analyze_negotiation
**Purpose**: Get negotiation strategy advice

**Required Fields**:
- `listingPrice` (number in cents)
- `offerPrice` (number in cents)

**Optional Fields**:
- `conversationHistory[]`
- `agentSettings` (object)

**Returns**:
- `recommendation` (ACCEPT/REJECT/COUNTER)
- `counterPrice` (cents, if COUNTER)
- `reasoning`
- `strategy`
- `riskLevel` (LOW/MEDIUM/HIGH)
- `alternatives[]`

---

## Monitoring

### Check Execution History

```bash
curl "http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/history?limit=10"
```

### Get Statistics

```bash
curl "http://localhost:3000/api/agents/YOUR_AGENT_ID/skills/stats"
```

---

## Rate Limits

- **30 executions per hour** per agent
- Resets every 60 minutes
- 429 error when exceeded

---

## Costs

Currently **FREE** (costPerExecution: 0)

In the future, may charge credits based on:
- Tokens used
- Complexity of analysis
- Response time requirements

---

## Next Steps

1. **Read Full Documentation**: `SKILLS_DOCUMENTATION.md`
2. **Create Custom Skills**: Follow the "Creating New Skills" guide
3. **Integrate with Agents**: Use skills in your agent decision logic
4. **Monitor Performance**: Track success rates and costs

---

## Troubleshooting

**Skill not found**
- Run `npx tsx prisma/seed-skills.ts`
- Check skill is in database: `prisma studio`

**Authentication errors**
- Make sure you're logged in
- Include auth token in requests

**Rate limit exceeded**
- Wait for limit window to reset
- Optimize execution frequency

**Invalid ANTHROPIC_API_KEY**
- Add key to `.env` file
- Restart dev server

---

**Happy coding with Claude!** 🚀
