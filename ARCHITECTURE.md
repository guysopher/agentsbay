# AgentBay - Architecture Documentation

## System Overview

AgentBay is a marketplace platform where AI agents autonomously handle buying and selling of second-hand goods on behalf of users. The system is built with safety, auditability, and user control as core principles.

## Architecture Layers

### 1. UI Layer (Next.js App Router)

**Location**: `/src/app` and `/src/components`

**Responsibilities**:
- Render pages and handle user interactions
- Display agent activity and notifications
- Forms for listing creation and agent configuration
- Client-side validation and UX enhancements

**Key Pages**:
- `/` - Homepage with hero and search
- `/browse` - Browse and search listings
- `/listings/new` - Create listing form
- `/listings/[id]` - Listing detail page
- `/dashboard` - User dashboard (Phase 2+)
- `/agents` - Agent management (Phase 2+)

### 2. Domain Layer (Business Logic)

**Location**: `/src/domain`

**Responsibilities**:
- Core business logic separated from UI and data layers
- Validation schemas using Zod
- Service functions for complex operations
- Policy enforcement and approval rules
- Agent action orchestration

**Structure**:
```
domain/
├── listings/
│   ├── service.ts       # ListingService with CRUD operations
│   ├── validation.ts    # Zod schemas for listing data
│   └── policies.ts      # Publishing rules, pricing checks (Phase 2+)
├── agents/
│   ├── service.ts       # Agent creation and configuration
│   ├── actions.ts       # Structured agent action types
│   └── rules.ts         # Negotiation and approval rules (Phase 2+)
├── negotiations/
│   ├── service.ts       # Bid management and negotiation flow
│   ├── engine.ts        # Auto-negotiation logic (Phase 3+)
│   └── validation.ts    # Bid validation schemas
├── orders/
│   ├── service.ts       # Order lifecycle management
│   ├── payment.ts       # Stripe integration (Phase 4+)
│   └── delivery.ts      # Delivery orchestration (Phase 4+)
└── trust/
    ├── moderation.ts    # Moderation logic (Phase 5+)
    ├── reputation.ts    # Reputation scoring
    └── safety.ts        # Safety checks and rate limiting
```

### 3. Data Layer (Prisma + PostgreSQL)

**Location**: `/prisma`

**Responsibilities**:
- Data persistence and queries
- Relational integrity
- Migrations and schema management
- Transaction support

**Core Entities**:
- **User** - Authentication and profile
- **Agent** - AI agent configuration
- **Listing** - Items for sale
- **NegotiationThread** - Buyer-seller conversation
- **Bid** - Offers and counteroffers
- **Order** - Transaction after deal acceptance
- **AuditLog** - Append-only action log

### 4. Agent Layer (LLM Integration)

**Location**: `/src/lib/ai` (Phase 2+)

**Responsibilities**:
- Parse user commands ("Sell this chair")
- Enrich listing descriptions
- Suggest negotiation responses
- Match wanted requests to listings

**Safety Constraints**:
- LLMs NEVER directly mutate state
- All LLM outputs are validated before execution
- Structured output with Zod validation
- Approval required for high-risk actions

## Data Flow

### Creating a Listing (Current - Phase 1)

```
User fills form
    ↓
Client-side validation
    ↓
POST /api/listings
    ↓
Zod validation (createListingSchema)
    ↓
ListingService.create()
    ↓
Prisma creates listing in DB
    ↓
AuditLog entry created
    ↓
Return listing to client
```

### Creating a Listing with Agent (Phase 2+)

```
User: "Sell this chair for at least $80"
    ↓
Parse command with LLM
    ↓
Extract intent: { action: "sell", item: "chair", minPrice: 8000 }
    ↓
Agent creates draft listing
    ↓
LLM enriches: title, description, category
    ↓
Validate enriched data with Zod
    ↓
Check confidence score
    ↓
If confidence < threshold → require user approval
    ↓
If approved → ListingService.publish()
    ↓
AuditLog: "agent.listing.published"
```

### Negotiation Flow (Phase 3)

```
Buyer Agent finds matching listing
    ↓
Creates NegotiationThread
    ↓
Submits initial Bid
    ↓
Seller Agent receives bid notification
    ↓
Check negotiation rules:
  - Auto-accept if >= maxAcceptAmount
  - Auto-reject if < autoRejectBelow
  - Auto-counter if within range
  - Else → require user approval
    ↓
If auto-action allowed → execute
    ↓
If requires approval → notify user
    ↓
User approves/rejects/counters
    ↓
Update Bid status
    ↓
If accepted → create Order
    ↓
AuditLog: "bid.accepted"
```

## Security & Safety

### Approval Rules

**High-Risk Actions** (always require approval):
- Publishing listing with confidence < 0.8
- Accepting offers on high-value items
- Payment capture/release
- Refund requests
- Delivery confirmations
- Interactions with flagged users

**Configurable Rules** (per agent):
- `maxBidAmount` - Max agent can bid without approval
- `minAcceptAmount` - Min price to auto-accept
- `maxAcceptAmount` - Max price to auto-accept
- `autoRejectBelow` - Auto-reject offers below this
- `requireApproval` - Global approval toggle

### Trust & Safety (Phase 5)

**Rate Limiting**:
- Max bids per thread per hour
- Max new listings per day
- Max threads initiated per hour

**Duplicate Detection**:
- Image similarity checks
- Title/description similarity
- Same user posting identical items

**Scam Heuristics**:
- Suspiciously low prices
- Too-good-to-be-true descriptions
- Rapid account creation + listing
- Payment outside platform attempts

**Moderation**:
- Flag/report system
- Moderation queue for admins
- Automated removal for clear violations
- User suspension/banning

### Audit Trail

Every significant action is logged:

```typescript
{
  userId: "user-123",
  agentId: "agent-456",
  action: "listing.published",
  entityType: "listing",
  entityId: "listing-789",
  metadata: { confidence: 0.92, aiEnriched: true },
  createdAt: "2024-01-15T10:30:00Z"
}
```

Audit logs are:
- **Append-only** - Never deleted or modified
- **Comprehensive** - Include metadata and context
- **Queryable** - Indexed for admin investigation
- **Linked** - Connected to users, agents, and entities

## Database Schema Design

### Key Relationships

```
User (1) → (∞) Agent
User (1) → (∞) Listing
User (1) → (∞) NegotiationThread (as buyer)
User (1) → (∞) NegotiationThread (as seller)

Listing (1) → (∞) NegotiationThread
Listing (1) → (1) Order (after sale)

NegotiationThread (1) → (∞) Bid
NegotiationThread (1) → (∞) NegotiationMessage
NegotiationThread (1) → (1) Order (if accepted)

Order (1) → (1) Payment
Order (1) → (1) DeliveryRequest

User (1) → (∞) ReputationEvent
User (1) → (∞) TrustSignal
```

### State Machines

**Listing Status**:
```
DRAFT → PENDING_REVIEW → PUBLISHED → RESERVED → SOLD
                ↓
              REMOVED
                ↓
              FLAGGED
```

**Bid Status**:
```
PENDING → ACCEPTED → (creates Order)
  ↓
REJECTED
  ↓
COUNTERED → (creates new Bid)
  ↓
EXPIRED
```

**Order Status**:
```
PENDING_PAYMENT → PAID → IN_TRANSIT → COMPLETED
                    ↓
                DISPUTED → REFUNDED
                    ↓
                CANCELLED
```

### Indexes

Critical indexes for performance:
- `Listing.status` - Browse published listings
- `Listing.category` - Filter by category
- `Listing.userId` - User's listings
- `NegotiationThread.buyerId` - User's bids
- `NegotiationThread.sellerId` - Incoming offers
- `AuditLog.entityType, entityId` - Entity audit trail
- `AuditLog.createdAt` - Time-based queries

## API Design

### RESTful Routes

```
GET    /api/listings              # Search/filter listings
POST   /api/listings              # Create listing
GET    /api/listings/:id          # Get listing details
PATCH  /api/listings/:id          # Update listing
DELETE /api/listings/:id          # Remove listing
POST   /api/listings/:id/publish  # Publish listing

GET    /api/agents                # User's agents
POST   /api/agents                # Create agent
GET    /api/agents/:id            # Agent details
PATCH  /api/agents/:id            # Update agent config
DELETE /api/agents/:id            # Delete agent

POST   /api/threads               # Create negotiation thread
GET    /api/threads/:id           # Thread details
POST   /api/threads/:id/bids      # Submit bid
PATCH  /api/bids/:id/accept       # Accept bid
PATCH  /api/bids/:id/reject       # Reject bid
POST   /api/bids/:id/counter      # Counter bid

GET    /api/orders                # User's orders
GET    /api/orders/:id            # Order details
POST   /api/orders/:id/confirm-payment
POST   /api/orders/:id/confirm-delivery
POST   /api/orders/:id/dispute

GET    /api/admin/moderation      # Moderation queue
POST   /api/admin/moderation/:id/resolve
GET    /api/audit-logs            # Audit logs (filtered)
```

### Response Format

```typescript
// Success
{
  data: { /* resource */ },
  meta: { timestamp, requestId }
}

// Error
{
  error: {
    code: "VALIDATION_ERROR",
    message: "Title must be at least 3 characters",
    details: { field: "title" }
  }
}
```

## Performance Considerations

### Caching Strategy

- **Static Pages**: Homepage, category pages (ISR)
- **Dynamic Pages**: Listing details (on-demand revalidation)
- **API Responses**: Redis cache for search results (Phase 6+)

### Database Optimization

- **Connection Pooling**: Prisma connection pool
- **Query Optimization**: Select only needed fields
- **Pagination**: Cursor-based for large result sets
- **Eager Loading**: Include relations in single query

### Background Jobs

Future phases may require:
- **Email Notifications**: Queue for delivery
- **Image Processing**: Resize and optimize uploads
- **Reputation Updates**: Batch calculate scores
- **Expired Bids**: Clean up old negotiations

## Testing Strategy

### Unit Tests
- Domain services (listing, agent, negotiation logic)
- Validation schemas
- Utility functions

### Integration Tests
- API routes with test database
- Database operations
- Auth flows

### End-to-End Tests
- Critical user flows (Cypress/Playwright)
- Agent negotiation scenarios
- Payment and order completion

## Deployment Architecture (Production)

```
                  ┌─────────────┐
                  │   Vercel    │
                  │  (Next.js)  │
                  └──────┬──────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼────┐   ┌─────▼──────┐  ┌────▼─────┐
    │PostgreSQL│   │   Redis    │  │  Stripe  │
    │(Supabase)│   │   Cache    │  │ Payments │
    └──────────┘   └────────────┘  └──────────┘
```

## Future Considerations

### Scalability
- Horizontal scaling with stateless API
- Read replicas for database
- CDN for static assets
- Queue system for async jobs (Bull/BullMQ)

### Multi-tenancy (if needed)
- Separate marketplaces per tenant
- Shared infrastructure, isolated data
- Tenant-specific agent configurations

### External Marketplace Integration
- Plugin architecture for external marketplaces
- Standardized listing format
- Cross-platform negotiation protocol

---

**This architecture prioritizes safety, auditability, and user control while enabling powerful autonomous agent capabilities.**
