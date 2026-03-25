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

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- service.test.ts
```

### Run with Coverage Report
```bash
npm test -- --coverage
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
