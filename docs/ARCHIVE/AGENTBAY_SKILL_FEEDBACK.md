# AgentBay Skill - Feedback & Improvement Suggestions

**Date**: 2026-03-24
**Tester**: Claude (AI Agent)
**Task**: Create a listing for an old school bag at 10 ILS

---

## Summary

Successfully created a listing, but encountered several friction points related to authentication, deployment setup, and documentation gaps. The core functionality works well, but the agent-first experience needs refinement.

---

## What Worked Well ✅

### 1. **Database Schema & Data Model**
- Clean, well-structured Prisma schema
- Proper validation with Zod
- Good separation of concerns (user, agent, listing)
- Support for multiple currencies and conditions

### 2. **Local Development Experience**
- Once understood, the Prisma approach was straightforward
- Development server worked reliably
- Database operations were fast and predictable

### 3. **API Design Fundamentals**
- RESTful endpoint structure is logical
- Proper error responses with structured format
- Good use of TypeScript types

---

## Critical Issues 🔴

### 1. **Authentication Model Confusion**

**Problem**: Mixed authentication requirements aren't clear:
- Agent registration requires `userId` (not documented in skill)
- Agent gets API key via `X-Agent-Key` header
- But listing creation requires NextAuth session authentication
- Agents cannot obtain session cookies programmatically

**Impact**: Agents cannot actually create listings via the API as documented

**Example**:
```bash
# This fails even with valid X-Agent-Key
curl -X POST http://localhost:3000/api/listings \
  -H "X-Agent-Key: sk_test_..." \
  -d '{...}'

# Returns: "You must be logged in to create a listing"
```

**Recommendations**:
1. **Choose one authentication model for agents**:
   - Option A: Allow `X-Agent-Key` for all agent operations
   - Option B: Document that agents need user delegation tokens
   - Option C: Add agent-specific endpoints (`/api/agent/listings`)

2. **Update skill documentation** to clarify:
   - Which endpoints require user auth vs agent auth
   - How agents should authenticate on behalf of users
   - Token delegation flow if needed

### 2. **Deployment Protection Barrier**

**Problem**: The deployed API has Vercel authentication protection:
- Standard `curl` requests get HTML auth pages
- Requires `vercel curl` CLI command
- Not documented in skill files
- Breaks agent automation

**Impact**: Agents trying to use the production API will fail silently or get HTML instead of JSON

**Recommendations**:
1. **For development**: Add bypass token instructions to README
2. **For production**: Consider these options:
   - Public API endpoints at `/api/public/*`
   - API key authentication that bypasses Vercel protection
   - Separate API subdomain without protection
3. **Update skill docs** with deployment-specific auth instructions

### 3. **Skill Documentation Gaps**

**Missing Information**:
- No explanation of `userId` requirement in registration
- No mention of Vercel deployment protection
- No guidance on local vs deployed API differences
- Missing error code reference
- No rate limit details in skill file (only in separate doc)

**Recommendations**:
1. Add a **Troubleshooting** section to the skill file:
```yaml
troubleshooting:
  - error: "Validation error: userId Required"
    solution: "Include userId in registration payload"
  - error: "HTML response instead of JSON"
    solution: "Use vercel curl for deployed endpoints"
  - error: "You must be logged in"
    solution: "Listing creation requires user session, not agent key"
```

2. Add an **Environment** section:
```yaml
environments:
  local:
    base_url: "http://localhost:3000"
    authentication: "Session-based (dev mode allows bypass)"
  production:
    base_url: "https://agent-2t3czbnvn-guysophers-projects.vercel.app"
    authentication: "Vercel protection + Session required"
    note: "Use vercel curl or bypass token"
```

---

## Medium Priority Issues 🟡

### 4. **Price Format Ambiguity**

**Problem**: Skill docs say "prices in cents" but:
- Field is named `price`, not `priceInCents`
- No indication of what "cents" means for non-USD currencies
- ILS uses agorot (1/100 ILS), but is this documented?

**Recommendations**:
1. Rename field to `priceInMinorUnits` or `priceInCents` for clarity
2. Add currency-specific documentation:
```typescript
// Prices are always in the smallest currency unit:
// USD: cents (100 = $1.00)
// ILS: agorot (100 = ₪1.00)
// EUR: cents (100 = €1.00)
```

3. Add helper function in skill response:
```typescript
{
  price: 1000,
  currency: "ILS",
  formatted: "₪10.00" // Add this
}
```

### 5. **Agent Registration Flow**

**Problem**:
- Agent registration auto-creates users
- `userId` must be provided by caller (not generated)
- Risk of collision if multiple agents use same format
- Email auto-generation: `${userId}@agent.agentbay.com`

**Current Code** (src/app/api/agent/register/route.ts:24):
```typescript
await db.user.create({
  data: {
    id: validatedData.userId,
    email: `${validatedData.userId}@agent.agentbay.com`,
    name: validatedData.name || "Agent User",
  },
})
```

**Recommendations**:
1. **Make userId optional** - generate if not provided:
```typescript
const userId = validatedData.userId || `agent_${generateUniqueId()}`
```

2. **Add agent-specific email domain** in env:
```typescript
email: `${userId}@${process.env.AGENT_EMAIL_DOMAIN || 'agent.agentbay.com'}`
```

3. **Return userId in response** for reference:
```typescript
return successResponse({
  userId: user.id, // Add this
  agentId: result.agent.id,
  apiKey: result.apiKey,
  // ...
})
```

### 6. **Location Handling**

**Problem**:
- `agentbay_set_location` mentioned in skill docs
- But no implementation found in codebase
- Listings have `address`, `latitude`, `longitude` fields
- No geocoding service integration visible
- **CRITICAL**: Location must be an exact physical address (street, city, country)
  - Should NOT include apartment numbers, floor numbers, or unit details
  - Format examples: "123 Main St, San Francisco, CA", "Tel Aviv, Israel"
  - This is for privacy and general pickup area indication only

**Current Issues**:
- No validation on address format
- No guidance in skill docs about address requirements
- Agents might include overly specific details (apartment #, floor)
- No clear specification of what "address" means (full street vs city only)

**Recommendations**:
1. **Document address requirements clearly in skill**:
```yaml
location:
  required: true
  format: "Physical street address or city"
  examples:
    - "123 Main Street, Tel Aviv, Israel"
    - "Downtown Seattle, WA"
    - "Berlin, Germany"
  privacy_note: "Do not include apartment/unit numbers or floor details"
  validation: "Must be geocodable to latitude/longitude"
```

2. **Add validation to reject overly specific addresses**:
```typescript
// Warn if address contains apartment indicators
const apartmentIndicators = /\b(apt|apartment|unit|floor|#\d+|suite)\b/i
if (apartmentIndicators.test(address)) {
  return errorResponse(
    "Address should not include apartment/unit numbers. Use general street address only.",
    400
  )
}
```

3. **Implement geocoding service** to validate addresses:
   - Use Google Maps Geocoding API or OpenStreetMap Nominatim
   - Auto-populate latitude/longitude from address
   - Validate that address resolves to a real location

4. **Add address sanitization**:
   - Strip out apartment/unit numbers automatically
   - Normalize format (Title Case, proper punctuation)
   - Extract city/region for search faceting

---

## Minor Issues & Suggestions 🔵

### 7. **Error Response Consistency**

Different error formats encountered:
```json
// Format 1 (Zod validation)
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation error",
    "details": {"errors": [...]}
  }
}

// Format 2 (Auth)
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "...",
    "statusCode": 401
  }
}
```

**Recommendation**: Standardize error response shape in all API handlers

### 8. **Missing Examples**

**Add to docs**:
- Complete end-to-end example (register → auth → create listing)
- Multi-currency examples
- Image upload workflow
- Location with coordinates example

### 9. **Skill Response Format**

The skill API should return more agent-friendly data:

**Current**: Raw listing object
**Better**: Include action guidance

```typescript
{
  listing: {...},
  nextActions: [
    "Add images via /api/listings/{id}/images",
    "Share listing at: https://agentbay.com/l/{id}",
    "Monitor bids at: /api/listings/{id}/bids"
  ],
  publicUrl: "https://agentbay.com/listings/cmn4ct6d20003t0al5dfe6za8"
}
```

### 10. **Rate Limiting Visibility**

**Current**: Rate limits applied, but agent doesn't know remaining quota
**Better**: Include headers/response fields:

```typescript
{
  data: {...},
  meta: {
    timestamp: "...",
    rateLimit: {
      remaining: 27,
      resetAt: "2026-03-24T09:30:00Z"
    }
  }
}
```

---

## Feature Suggestions 💡

### 1. **Agent Delegation Tokens**
Allow agents to act on behalf of users with scoped permissions:
```typescript
// User grants agent permission
POST /api/users/me/agents/{agentId}/delegate
{
  permissions: ["listings.create", "listings.update"],
  expiresIn: "7d"
}

// Returns delegation token
{
  delegationToken: "agt_del_...",
  expiresAt: "2026-03-31T..."
}

// Agent uses it
POST /api/listings
Authorization: Bearer agt_del_...
```

### 2. **Dry Run Mode**
Let agents preview actions without committing:
```typescript
POST /api/listings?dryRun=true
{
  title: "Test",
  // ...
}

// Returns validation + preview
{
  valid: true,
  preview: {
    estimatedFees: 0,
    publishedUrl: "https://agentbay.com/listings/preview-xyz",
    expiresAt: "2026-03-24T10:00:00Z"
  }
}
```

### 3. **Webhook Support**
Notify agents of events:
```typescript
POST /api/agent/webhooks
{
  url: "https://my-agent.com/webhook",
  events: ["listing.bid_received", "listing.sold"]
}
```

### 4. **Batch Operations**
Create multiple listings efficiently:
```typescript
POST /api/listings/batch
{
  listings: [
    {title: "Item 1", ...},
    {title: "Item 2", ...}
  ]
}
```

---

## Testing Gaps

The following scenarios need testing:

1. **Agent authentication flow** - end to end
2. **Error handling** - all error codes with examples
3. **Rate limiting** - verify limits work as documented
4. **Currency handling** - test ILS, EUR, GBP, not just USD
5. **Image upload** - how do agents add images?
6. **Listing updates** - can agents edit listings after creation?
7. **Concurrent operations** - multiple agents creating listings
8. **Address format validation** - test rejection of apartment numbers, validation of physical addresses only

---

## Documentation Improvements Needed

### Update Skill File
1. Add authentication section with clear explanation
2. Add environment-specific instructions
3. Add error code reference
4. Add currency format guide
5. Add complete workflow examples
6. **Add address format requirements** - specify exact physical address only, no apartment/unit numbers

### Update README
1. Add "Using with Agents" section
2. Document deployment protection setup
3. Add API authentication guide
4. Add troubleshooting section

### Add New Docs
1. **AGENT_INTEGRATION.md** - Complete guide for agent developers
2. **API_REFERENCE.md** - Full endpoint documentation
3. **DEPLOYMENT.md** - Production setup guide with auth config

---

## Priority Ranking

**Must Fix Before Production**:
1. Clarify authentication model (agent key vs session)
2. Fix/document deployment protection
3. Update skill docs with accurate auth info

**Should Fix Soon**:
4. Standardize error responses
5. Make userId optional in registration
6. Add rate limit visibility
7. **Document and validate address format** (privacy concern - prevent apartment numbers)

**Nice to Have**:
7. Agent delegation tokens
8. Dry run mode
9. Batch operations
10. Webhook support

---

## Conclusion

AgentBay has a solid foundation with good architecture and data modeling. The main barrier to agent adoption is the **authentication confusion** between agent API keys and user sessions.

**Recommendation**: Choose one of these paths:

**Path A: Agent-First** (Recommended)
- Make X-Agent-Key work for all operations
- Remove session requirement for agent operations
- Add user delegation for sensitive actions

**Path B: Hybrid**
- Keep session auth for user operations
- Add separate `/api/agent/*` endpoints with API key auth
- Document the split clearly

**Path C: User-Delegated**
- Keep current session auth
- Add delegation token flow
- Document that agents need user permission

The current mixed model creates friction and prevents the "agent-first marketplace" vision from working smoothly.

---

**Overall Assessment**: 7/10
- Core functionality: 9/10
- Agent experience: 4/10
- Documentation: 6/10
- API design: 8/10

With authentication clarification and documentation updates, this could easily be a 9/10 agent-first marketplace platform.
