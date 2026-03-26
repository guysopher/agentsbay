# 🔍 AgentBay - Code Review & Improvements

**Reviewer**: Self-Review after building
**Date**: March 22, 2026

After building the entire AgentBay platform, I've identified several areas for improvement. This review covers architecture, security, performance, and code quality issues.

---

## 🔴 Critical Issues

### 1. **Transaction Safety in Domain Services**

**Issue**: Audit logs are created separately from main operations, risking data inconsistency if audit fails.

**Current Code** (src/domain/listings/service.ts:7-46):
```typescript
static async create(userId: string, data: CreateListingInput, agentId?: string) {
  const listing = await db.listing.create({ /* ... */ })

  // ❌ If this fails, listing exists but no audit trail
  await db.auditLog.create({ /* ... */ })

  return listing
}
```

**Improvement**: Use Prisma transactions
```typescript
static async create(userId: string, data: CreateListingInput, agentId?: string) {
  return db.$transaction(async (tx) => {
    const listing = await tx.listing.create({ /* ... */ })

    await tx.auditLog.create({
      data: {
        userId,
        agentId,
        action: "listing.created",
        entityType: "listing",
        entityId: listing.id,
        metadata: { title: data.title },
      },
    })

    return listing
  })
}
```

**Apply to**: All domain services (AgentService, future services)

---

### 2. **Not Using Custom Error Classes**

**Issue**: ListingService throws generic `Error` instead of custom error classes I created.

**Current Code** (src/domain/listings/service.ts:59):
```typescript
if (!listing) {
  throw new Error("Listing not found")  // ❌ Generic error
}
```

**Improvement**:
```typescript
import { NotFoundError, ForbiddenError } from "@/lib/errors"

if (!listing) {
  throw new NotFoundError("Listing")  // ✅ Typed error with proper status code
}

// For authorization
if (listing.userId !== userId) {
  throw new ForbiddenError("You don't own this listing")
}
```

**Why**: Custom errors provide:
- Proper HTTP status codes
- Consistent error format
- Better error tracking
- Type-safe error handling

---

### 3. **API Routes Not Using Wrapper**

**Issue**: API routes have basic error handling, not using the `createApiHandler` I built.

**Current Code** (src/app/api/listings/route.ts):
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = createListingSchema.parse(body)
    const userId = "mock-user-id"
    const listing = await ListingService.create(userId, validated)
    return NextResponse.json(listing)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create listing" },
      { status: 400 }  // ❌ Always 400, no logging, no request tracking
    )
  }
}
```

**Improvement**:
```typescript
import { createApiHandler, successResponse } from "@/lib/api-handler"
import { auth } from "@/lib/auth"

export const { GET, POST } = createApiHandler({
  GET: async (request) => {
    const { searchParams } = new URL(request.url)
    const params = {
      query: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
      minPrice: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      maxPrice: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    }

    const listings = await ListingService.search(params)
    return successResponse(listings)
  },

  POST: async (request) => {
    // Get authenticated user
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("Must be logged in")
    }

    const body = await request.json()
    const validated = createListingSchema.parse(body)

    const listing = await ListingService.create(session.user.id, validated)
    return successResponse(listing, 201)
  },
})
```

**Benefits**:
- Automatic error handling with correct status codes
- Request/response logging with request IDs
- Zod error formatting
- Consistent response format
- Error tracking

---

### 4. **Missing Rate Limiting**

**Issue**: No rate limiting on API routes or domain services.

**Add to API routes**:
```typescript
import { rateLimiter, RATE_LIMITS } from "@/lib/rate-limit"

export const { POST } = createApiHandler({
  POST: async (request) => {
    const session = await auth()
    if (!session?.user?.id) {
      throw new UnauthorizedError("Must be logged in")
    }

    // ✅ Rate limit listing creation
    await rateLimiter.check(
      `listing:create:${session.user.id}`,
      RATE_LIMITS.LISTING_CREATE
    )

    const body = await request.json()
    const validated = createListingSchema.parse(body)
    const listing = await ListingService.create(session.user.id, validated)

    return successResponse(listing, 201)
  },
})
```

---

## 🟡 Security Issues

### 5. **Email Exposure in API Responses**

**Issue**: User emails are returned in listing queries (PII leakage).

**Current Code** (src/domain/listings/service.ts:131-136):
```typescript
include: {
  images: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,  // ❌ Email should not be public
    },
  },
}
```

**Improvement**:
```typescript
include: {
  images: true,
  user: {
    select: {
      id: true,
      name: true,
      // ✅ Don't expose email publicly
    },
  },
}
```

**Better**: Create DTOs (Data Transfer Objects)
```typescript
// src/types/dto.ts
export interface PublicUserDTO {
  id: string
  name: string | null
  // No email, password, etc.
}

export interface ListingDTO {
  id: string
  title: string
  description: string
  price: number
  // ...
  user: PublicUserDTO
}

// src/domain/listings/service.ts
static async search(params: SearchListingsInput): Promise<ListingDTO[]> {
  const listings = await db.listing.findMany({
    where,
    include: {
      images: true,
      user: { select: { id: true, name: true } },
    },
  })

  return listings  // Type-safe, no email exposed
}
```

---

### 6. **No Password Hashing on User Creation**

**Issue**: Seed script and future user creation need proper password hashing.

**Current Seed** (prisma/seed.ts:10):
```typescript
const hashedPassword = await bcrypt.hash("password123", 10)  // ✅ Good
```

**But missing in future signup**. Add:
```typescript
// src/domain/users/service.ts
import bcrypt from "bcryptjs"

export class UserService {
  static async create(email: string, password: string, name?: string) {
    // ✅ Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 12)  // 12 rounds

    return db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    })
  }
}
```

---

### 7. **Missing Input Sanitization**

**Issue**: User input could contain XSS attacks in titles/descriptions.

**Add sanitization**:
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })  // Strip all HTML
}

export function sanitizeText(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')  // Remove angle brackets
    .slice(0, 2000)  // Enforce max length
}

// In validation schema:
export const createListingSchema = z.object({
  title: z.string()
    .min(3)
    .max(100)
    .transform(sanitizeText),
  description: z.string()
    .min(10)
    .max(2000)
    .transform(sanitizeText),
  // ...
})
```

---

## 🟠 Performance Issues

### 8. **No Pagination**

**Issue**: Search returns max 50 listings, but no pagination support.

**Current Code** (src/domain/listings/service.ts:127-143):
```typescript
const listings = await db.listing.findMany({
  where,
  include: { /* ... */ },
  orderBy: { createdAt: "desc" },
  take: 50,  // ❌ Hard-coded limit, no offset
})
```

**Improvement**: Cursor-based pagination
```typescript
interface PaginatedResult<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
}

static async search(
  params: SearchListingsInput & { cursor?: string; limit?: number }
): Promise<PaginatedResult<Listing>> {
  const limit = params.limit || 20

  const listings = await db.listing.findMany({
    where,
    include: { /* ... */ },
    orderBy: { createdAt: "desc" },
    take: limit + 1,  // Take one extra to check if more exist
    ...(params.cursor && {
      cursor: { id: params.cursor },
      skip: 1,  // Skip the cursor item
    }),
  })

  const hasMore = listings.length > limit
  const items = hasMore ? listings.slice(0, limit) : listings
  const nextCursor = hasMore ? items[items.length - 1].id : undefined

  return { items, nextCursor, hasMore }
}
```

---

### 9. **Missing Database Indexes**

**Issue**: Searches on title/description will be slow without fulltext indexes.

**Add to schema**:
```prisma
model Listing {
  id          String   @id @default(cuid())
  title       String
  description String
  category    ListingCategory
  price       Int
  location    String
  status      ListingStatus
  createdAt   DateTime @default(now())

  // ... relations

  @@index([status, createdAt])  // ✅ For recent published listings
  @@index([category, status])   // ✅ For category filtering
  @@index([price])              // ✅ For price range queries
  @@fulltext([title, description])  // ✅ PostgreSQL fulltext search
}
```

**Use fulltext search**:
```typescript
// Instead of:
where.OR = [
  { title: { contains: params.query, mode: "insensitive" } },
  { description: { contains: params.query, mode: "insensitive" } },
]

// Use:
where.OR = [
  {
    AND: [
      { title: { search: params.query } },
      { description: { search: params.query } },
    ],
  },
]
```

---

### 10. **N+1 Query Risk**

**Issue**: Homepage loads listings with user data - potential N+1.

**Current is OK** (includes user in single query), but add:
```typescript
// Use Prisma's query optimization
static async search(params: SearchListingsInput) {
  const listings = await db.listing.findMany({
    where,
    include: {
      images: true,
      user: { select: { id: true, name: true } },
    },
    // ✅ Prisma batches these into a single query with JOIN
  })

  return listings
}
```

**Monitor with**:
```typescript
// Enable query logging in development
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]  // ✅ See all queries
}
```

---

## 🟢 Code Quality Issues

### 11. **Type Safety Issues**

**Issue**: Using `as any` in search function.

**Current Code** (src/domain/listings/service.ts:110):
```typescript
if (params.category) {
  where.category = params.category as any  // ❌ Defeats TypeScript
}
```

**Improvement**:
```typescript
import { ListingCategory, ItemCondition } from "@prisma/client"

export const searchListingsSchema = z.object({
  query: z.string().optional(),
  category: z.nativeEnum(ListingCategory).optional(),  // ✅ Type-safe enum
  condition: z.nativeEnum(ItemCondition).optional(),
  minPrice: z.number().int().positive().optional(),
  maxPrice: z.number().int().positive().optional(),
  location: z.string().optional(),
})

// Now category is properly typed:
if (params.category) {
  where.category = params.category  // ✅ No cast needed
}
```

---

### 12. **Missing Return Type Annotations**

**Issue**: Service methods don't declare return types.

**Current**:
```typescript
static async create(userId: string, data: CreateListingInput, agentId?: string) {
  // ...
}
```

**Improvement**:
```typescript
import type { Listing } from "@prisma/client"

type ListingWithRelations = Listing & {
  images: ListingImage[]
  user: Pick<User, 'id' | 'name'>
}

static async create(
  userId: string,
  data: CreateListingInput,
  agentId?: string
): Promise<ListingWithRelations> {
  // ...
}
```

---

### 13. **Error Messages Not i18n Ready**

**Issue**: All error messages are hardcoded in English.

**Improvement**:
```typescript
// src/lib/i18n/errors.ts
export const ERROR_MESSAGES = {
  LISTING_NOT_FOUND: "listing.errors.not_found",
  LISTING_CANNOT_PUBLISH: "listing.errors.cannot_publish",
  AGENT_LIMIT_EXCEEDED: "agent.errors.limit_exceeded",
} as const

// src/lib/i18n/en.ts
export const en = {
  listing: {
    errors: {
      not_found: "Listing not found",
      cannot_publish: "Listing cannot be published",
    },
  },
  agent: {
    errors: {
      limit_exceeded: "Maximum 5 agents per user",
    },
  },
}

// Use:
if (!listing) {
  throw new NotFoundError(t(ERROR_MESSAGES.LISTING_NOT_FOUND))
}
```

---

### 14. **No Logging in Domain Services**

**Issue**: Domain services don't log operations.

**Add logging**:
```typescript
import { logger } from "@/lib/logger"

export class ListingService {
  private static logger = logger.child({ service: 'ListingService' })

  static async create(userId: string, data: CreateListingInput, agentId?: string) {
    this.logger.info("Creating listing", { userId, agentId, title: data.title })

    try {
      const listing = await db.$transaction(async (tx) => {
        // ...
      })

      this.logger.info("Listing created successfully", {
        listingId: listing.id,
        userId,
      })

      return listing
    } catch (error) {
      this.logger.error("Failed to create listing", error, { userId, data })
      throw error
    }
  }
}
```

---

### 15. **Inconsistent Error Handling**

**Issue**: Some services use custom errors (AgentService), some don't (ListingService).

**Standardize**:
```typescript
// ❌ ListingService
throw new Error("Listing not found")

// ✅ AgentService
throw new NotFoundError("Agent")

// Make ListingService consistent:
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors"

export class ListingService {
  static async publish(listingId: string, userId: string) {
    const listing = await db.listing.findFirst({
      where: { id: listingId, userId },
    })

    if (!listing) {
      throw new NotFoundError("Listing")  // ✅ Consistent
    }

    if (listing.userId !== userId) {
      throw new ForbiddenError("You cannot publish this listing")
    }

    if (listing.status !== ListingStatus.DRAFT && listing.status !== ListingStatus.PENDING_REVIEW) {
      throw new ValidationError("Listing must be in DRAFT or PENDING_REVIEW status")
    }

    // ...
  }
}
```

---

## 🔵 Architecture Improvements

### 16. **Missing Repository Pattern**

**Issue**: Services directly use Prisma client - harder to test and swap DB.

**Improvement**: Add repository layer
```typescript
// src/repositories/listing.repository.ts
export class ListingRepository {
  async create(data: CreateListingData) {
    return db.listing.create({ data })
  }

  async findById(id: string) {
    return db.listing.findUnique({ where: { id } })
  }

  async search(where: Prisma.ListingWhereInput, options?: QueryOptions) {
    return db.listing.findMany({
      where,
      include: options?.include,
      orderBy: options?.orderBy,
      take: options?.limit,
    })
  }
}

// src/domain/listings/service.ts
export class ListingService {
  private static repo = new ListingRepository()

  static async create(userId: string, data: CreateListingInput) {
    return this.repo.create({
      userId,
      ...data,
      status: ListingStatus.DRAFT,
    })
  }
}
```

**Benefits**:
- Easier testing (mock repository)
- Database abstraction
- Centralized query logic

---

### 17. **Missing Event System**

**Issue**: No way to react to domain events (e.g., send email when listing published).

**Add event emitter**:
```typescript
// src/lib/events.ts
import { EventEmitter } from 'events'

export const eventBus = new EventEmitter()

export const EVENTS = {
  LISTING_CREATED: 'listing.created',
  LISTING_PUBLISHED: 'listing.published',
  BID_RECEIVED: 'bid.received',
  ORDER_COMPLETED: 'order.completed',
} as const

// src/domain/listings/service.ts
import { eventBus, EVENTS } from "@/lib/events"

static async publish(listingId: string, userId: string) {
  const updated = await db.listing.update({ /* ... */ })

  // ✅ Emit event for other systems to react
  eventBus.emit(EVENTS.LISTING_PUBLISHED, {
    listingId: updated.id,
    userId,
    listing: updated,
  })

  return updated
}

// src/services/notifications.ts
eventBus.on(EVENTS.LISTING_PUBLISHED, async (data) => {
  // Send notification
  // Update search index
  // Post to social media
  // etc.
})
```

---

### 18. **No Soft Delete**

**Issue**: Delete permanently removes listings - no recovery.

**Add soft delete to schema**:
```prisma
model Listing {
  id        String    @id @default(cuid())
  // ... other fields
  deletedAt DateTime?

  @@index([deletedAt])  // For filtering out deleted items
}
```

**Update service**:
```typescript
static async delete(listingId: string, userId: string) {
  const listing = await db.listing.findFirst({
    where: { id: listingId, userId, deletedAt: null },  // ✅ Only non-deleted
  })

  if (!listing) {
    throw new NotFoundError("Listing")
  }

  // ✅ Soft delete instead of hard delete
  return db.listing.update({
    where: { id: listingId },
    data: { deletedAt: new Date() },
  })
}

// Filter deleted items in queries:
static async search(params: SearchListingsInput) {
  const where: Prisma.ListingWhereInput = {
    status: ListingStatus.PUBLISHED,
    deletedAt: null,  // ✅ Exclude deleted
  }
  // ...
}
```

---

## 🎨 UI/UX Improvements

### 19. **No Loading States**

**Issue**: Pages don't show loading indicators during data fetch.

**Add Suspense boundaries**:
```typescript
// src/app/page.tsx
import { Suspense } from 'react'

function ListingsGrid() {
  const recentListings = await ListingService.search({})

  return (
    <div className="grid ...">
      {recentListings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section>...</section>

      {/* Recent Listings */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Recent Listings</h2>

          <Suspense fallback={
            <div className="grid grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          }>
            <ListingsGrid />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
```

---

### 20. **No Error Boundaries**

**Add error boundary**:
```typescript
// src/components/error-boundary.tsx
'use client'

import { Component, ReactNode } from 'react'
import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Use in layout:
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

---

## 📋 Summary of Priorities

### 🔴 Critical (Fix Immediately)
1. Use transactions for create/update operations
2. Switch to custom error classes everywhere
3. Implement API handler wrapper for all routes
4. Add rate limiting to all create endpoints
5. Remove email from public API responses

### 🟡 High Priority (Fix Before Phase 2)
6. Add pagination to search
7. Add database indexes for performance
8. Add input sanitization
9. Standardize error handling
10. Add return type annotations

### 🟢 Medium Priority (Nice to Have)
11. Add repository pattern
12. Implement event system
13. Add soft delete
14. Add logging to services
15. Add loading states and error boundaries

### 🔵 Low Priority (Future Enhancements)
16. i18n support
17. Full DTO layer
18. Advanced caching strategy
19. Monitoring and observability
20. Performance profiling

---

## 📝 Actionable Next Steps

1. **Create improvement branch**
   ```bash
   git checkout -b improvements/critical-fixes
   ```

2. **Fix critical issues first**
   - Update ListingService to use transactions
   - Replace all `throw new Error()` with custom errors
   - Wrap API routes with `createApiHandler`
   - Add rate limiting

3. **Add tests for improvements**
   ```typescript
   // tests/domain/listings/service.test.ts
   describe("ListingService with improvements", () => {
     it("should rollback transaction if audit log fails", async () => {
       // Test transaction safety
     })

     it("should throw NotFoundError with 404 status", async () => {
       // Test custom errors
     })
   })
   ```

4. **Update documentation**
   - Document new error handling patterns
   - Add API response examples
   - Update architecture diagrams

---

**This review found 20 concrete improvements across security, performance, architecture, and code quality. The codebase is solid but these changes will make it production-ready.**
