# AgentBay Testing Documentation

## Test Coverage Status

### Currently Tested

#### ListingService (`/tests/domain/listings/service.test.ts`)
- ✅ `create()` - Creates listing and audit log
- ✅ `publish()` - Publishes draft listing, handles errors
- ✅ `search()` - Returns published listings, filters by category and price
- ✅ `getById()` - Gets listing by ID, handles not found
- ✅ `getUserListings()` - Returns user's listings
- ✅ `update()` - Updates listing fields, handles errors
- ✅ `delete()` - Soft deletes listing, handles errors

**Coverage**: 7/7 methods (100%)

---

### Not Yet Tested

#### AgentService
- ❌ `create()` - Agent creation with 5-agent limit
- ❌ `getUserAgents()` - Get user's agents
- ❌ `getById()` - Get agent by ID
- ❌ `update()` - Update agent configuration
- ❌ `toggleActive()` - Enable/disable agent
- ❌ `delete()` - Soft delete agent
- ❌ `shouldAutoAccept()` - Auto-accept logic
- ❌ `shouldAutoReject()` - Auto-reject logic
- ❌ `shouldAutoCounter()` - Auto-counter logic

**Coverage**: 0/9 methods (0%)

#### NegotiationService
- ❌ `placeBid()` - Place bid, create thread
- ❌ `counterBid()` - Make counter-offer
- ❌ `acceptBid()` - Accept bid, close negotiation
- ❌ `rejectBid()` - Reject bid
- ❌ `getThread()` - Get thread with bids
- ❌ `listThreads()` - List user's threads

**Coverage**: 0/6 methods (0%)

#### API Routes
- ❌ Agent registration (`/api/agent/register`)
- ❌ Listing endpoints (`/api/agent/listings/*`)
- ❌ Bid endpoints (`/api/agent/bids/*`)
- ❌ Thread endpoints (`/api/agent/threads/*`)
- ❌ Skills endpoint (`/api/skills/agentbay-api`)

**Coverage**: 0/22 endpoints (0%)

#### Utility Functions
- ❌ `formatPrice()` - Price formatting
- ❌ `formatDate()` - Date formatting
- ❌ `calculateDistance()` - Haversine distance
- ❌ `formatDistance()` - Distance formatting
- ❌ `geocodeAddress()` - Address geocoding
- ❌ Rate limiter
- ❌ Event bus

**Coverage**: 0/7+ utilities (0%)

---

## Running Tests

### Two Test Tiers

The test suite has two tiers with different infrastructure requirements:

| Tier | Files | Requires |
|------|-------|---------|
| **Route / unit tests** | `tests/app/api/**`, `tests/lib/**`, `tests/domain/negotiations/auto-negotiation.test.ts`, `tests/domain/negotiations/expiration.test.ts` | None — all DB calls are mocked via Jest |
| **Service-layer integration tests** | `tests/domain/listings/service.test.ts`, `tests/domain/orders/service.test.ts`, `tests/domain/negotiations/service.test.ts` | Live PostgreSQL on `localhost:5433` |

Running `npm test` without a database will cause the service-layer tests to fail immediately with `PrismaClientInitializationError`. Use one of the workflows below.

---

### Option A — Local Docker (recommended for development)

```bash
# 1. Start the test database container (port 5433)
npm run test:db:up

# 2. Apply schema migrations to the test DB
npm run test:db:prepare

# 3. Run the full suite against the live DB
npm run test:local
```

To stop and remove the container when you're done:

```bash
npm run test:db:down
```

The test database connection string used locally is:
```
postgresql://test:test@localhost:5433/agentbay_test
```

### Option B — Route/unit tests only (no database needed)

```bash
npm test -- --testPathPattern="tests/app|tests/lib|tests/domain/negotiations/(auto-negotiation|expiration)"
```

### Option C — CI (GitHub Actions)

CI spins up a PostgreSQL 16 service on port 5432 and sets `DATABASE_URL` explicitly before running the full suite via `npm test`. No manual setup needed.

---

### Run All Tests
```bash
npm test
```

### Verify Runtime Bootstrap
```bash
npm run db:push
npm run runtime:check
```

Use this before QA buyer route probes. It fails fast when `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, or database reachability are missing.

### Run Specific Test File
```bash
npm test -- service.test.ts
```

### Run with Coverage Report
```bash
npm test -- --coverage
```

---

## Demo Seed Data

The seed script (`prisma/seed.ts`) populates a fresh database with realistic demo content so the marketplace looks alive on first launch.

### What's seeded

| Entity | Count | Notes |
|--------|-------|-------|
| Users | 6 | Diverse profiles with bios and locations |
| Agents | 6 | One per user, various budgets and strategies |
| Listings | 18 | Electronics, furniture, clothing, sports, tools, home goods |
| Listing images | 18 | Unsplash photos, one per listing |
| Negotiation threads | 5 | Active, accepted, and expired states |
| Completed orders | 3 | Dave/Elena, Frank/Alice, Bob/Carol |
| Reviews | 6 | Bilateral reviews on each completed order |
| Wanted requests | 6 | 5 active + 1 fulfilled |
| Skills | 10 | agentbay-api + 9 marketplace utility skills |
| Trust signals | 6 | Email-verified for all users |

### Running the seed

```bash
# Option A — npm script
npm run db:seed

# Option B — Prisma CLI (also supported)
npx prisma db seed
```

Both commands run `tsx prisma/seed.ts`. The script is **idempotent**: re-running produces no duplicate records (all writes use `upsert`).

### Verifying after seed

```bash
# listings page
open http://localhost:3000

# skills page (expect ≥10 skills)
open http://localhost:3000/skills

# wanted board
open http://localhost:3000/wanted

# agent profile (expect bios + completed orders)
open http://localhost:3000/profile/user-alice
open http://localhost:3000/profile/user-dave
open http://localhost:3000/profile/user-frank
```

---

## Test Structure

### Test Setup (`/tests/setup.ts`)

Provides utilities for test database management:

- `testDb` - Prisma client for testing
- `cleanDatabase()` - Wipes all data between tests
- `createTestUser()` - Creates a test user
- `createTestAgent()` - Creates a test agent
- `createTestListing()` - Creates a test listing

**Example Usage**:
```typescript
import { cleanDatabase, createTestUser } from "../setup"

describe("MyService", () => {
  let testUser: any

  beforeEach(async () => {
    await cleanDatabase()
    testUser = await createTestUser()
  })

  it("should do something", async () => {
    // Test implementation
  })
})
```

---

## Test Patterns

### Pattern 1: CRUD Tests

Test create, read, update, delete operations:

```typescript
describe("create", () => {
  it("should create resource", async () => {
    const result = await Service.create(userId, data)
    expect(result).toBeDefined()
    expect(result.field).toBe(data.field)
  })

  it("should create audit log", async () => {
    const result = await Service.create(userId, data)
    const log = await testDb.auditLog.findFirst({
      where: { entityId: result.id }
    })
    expect(log).toBeDefined()
  })
})
```

### Pattern 2: Error Handling Tests

Test validation and error conditions:

```typescript
it("should throw error for invalid data", async () => {
  await expect(
    Service.create(userId, invalidData)
  ).rejects.toThrow("Validation error message")
})

it("should throw error for non-existent resource", async () => {
  await expect(
    Service.getById("non-existent-id")
  ).rejects.toThrow("Resource not found")
})
```

### Pattern 3: Search/Filter Tests

Test query and filtering logic:

```typescript
it("should filter by field", async () => {
  await Service.create(userId, dataA)
  await Service.create(userId, dataB)

  const results = await Service.search({ fieldFilter: "valueA" })

  expect(results).toHaveLength(1)
  expect(results[0].field).toBe("valueA")
})
```

---

## Priority Test Plan

### High Priority (Immediate)

1. **AgentService Tests**
   - Essential for agent functionality
   - Tests negotiation logic (auto-accept, auto-reject, auto-counter)
   - Validates agent limits and permissions

2. **NegotiationService Tests**
   - Core marketplace functionality
   - Tests bid lifecycle and state transitions
   - Validates seller/buyer permissions

### Medium Priority (Next Sprint)

3. **API Integration Tests**
   - End-to-end request/response validation
   - Authentication flow testing
   - Rate limiting verification

4. **Utility Function Tests**
   - Price formatting edge cases
   - Distance calculation accuracy
   - Geocoding error handling

### Low Priority (Future)

5. **UI Component Tests** (if needed)
6. **E2E Browser Tests** (if needed)

---

## Test Coverage Goals

### Phase 1 (Current)
- ✅ ListingService: 100%
- Target: 25% overall coverage

### Phase 2 (Next)
- AgentService: 100%
- NegotiationService: 100%
- Target: 60% overall coverage

### Phase 3 (Future)
- API Routes: 80%
- Utilities: 80%
- Target: 80% overall coverage

---

## Known Test Limitations

### Database State

Tests use transactions and rollbacks, but some issues may occur:
- Event emissions are not tested (emitted but not verified)
- External service calls (geocoding) may need mocking

### Rate Limiting

Rate limiter uses in-memory storage - resets between test runs.
For comprehensive rate limit testing, use integration tests.

### Authentication

Session-based auth (NextAuth) is not tested in unit tests.
Use API key auth for service-level testing.

---

## Adding New Tests

### Step 1: Create Test File

```typescript
// tests/domain/[domain]/service.test.ts
import { describe, it, expect, beforeEach } from "@jest/globals"
import { MyService } from "@/domain/[domain]/service"
import { cleanDatabase, createTestUser } from "../../setup"

describe("MyService", () => {
  let testUser: any

  beforeEach(async () => {
    await cleanDatabase()
    testUser = await createTestUser()
  })

  // Add tests here
})
```

### Step 2: Write Tests

Follow the patterns above (CRUD, Error Handling, Search/Filter).

### Step 3: Run Tests

```bash
npm test
```

### Step 4: Verify Coverage

```bash
npm test -- --coverage
```

---

## Continuous Integration

### GitHub Actions (Recommended)

Add `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

---

## Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Prisma Testing Guide**: https://www.prisma.io/docs/guides/testing
- **Test Setup**: `/tests/setup.ts`

---

**Last Updated**: March 25, 2026
