# AgentBay - Development Roadmap

## Current Status: Phase 1 Complete ✅

## Phase 1: Foundation & Basic Marketplace ✅

**Goal**: Build working marketplace where users can create, browse, and view listings.

### Completed

- [x] Next.js 15 setup with TypeScript
- [x] Prisma schema with all entities
- [x] PostgreSQL database integration
- [x] NextAuth.js configuration
- [x] shadcn/ui component library
- [x] Homepage with hero section and "How It Works"
- [x] Browse/search listings page
- [x] Individual listing page
- [x] Create listing form
- [x] Listing domain service (CRUD operations)
- [x] API routes for listings
- [x] Seed data (2 users, 2 agents, 6 listings)
- [x] Basic navigation and layout
- [x] Utility functions (formatPrice, formatDate, etc.)

### Test Criteria

- [x] User can view homepage
- [x] User can browse listings
- [x] User can search by keyword
- [x] User can view listing details
- [x] User can create a new listing
- [x] Database properly seeded with sample data

---

## Phase 2: Agents & Commands 🚧 NEXT

**Goal**: Enable users to create agents and use natural language commands.

### To Build

#### Auth Flow
- [ ] Sign-in page with credentials
- [ ] Sign-up page with validation
- [ ] Session management with NextAuth
- [ ] Protected routes and middleware
- [ ] User profile page

#### Agent Management
- [ ] Agent creation form
  - Name, description
  - Negotiation preferences
  - Budget limits
  - Location preferences
- [ ] Agent list page (user's agents)
- [ ] Agent detail/edit page
- [ ] Agent activation toggle
- [ ] Agent domain service

#### Command Input
- [ ] Command input component
- [ ] LLM integration (OpenAI)
- [ ] Command parser service
  - "Sell this chair for at least $80"
  - "Find me a used MacBook under $1000"
  - Extract intent, item, price, location
- [ ] Command execution flow
- [ ] Validation of parsed commands

#### AI Listing Enrichment
- [ ] Draft listing creation from command
- [ ] LLM enrichment service
  - Generate title from description
  - Suggest category
  - Improve description
  - Recommend price based on market
- [ ] Confidence scoring
- [ ] User approval flow for low-confidence listings
- [ ] Edit enriched listings before publishing

#### Wanted Requests
- [ ] Wanted request creation form
- [ ] Wanted request list page
- [ ] Wanted request detail page
- [ ] Wanted domain service
- [ ] API routes for wanted requests
- [ ] Agent matching service (basic)

#### Initial Bidding
- [ ] Bid creation form
- [ ] Bid API routes
- [ ] Negotiation thread creation
- [ ] Basic bid validation

### Test Criteria

- [ ] User can sign up and sign in
- [ ] User can create an agent with preferences
- [ ] User can type "Sell my desk for $100" and agent creates listing
- [ ] Agent enriches listing with AI-generated content
- [ ] User can approve or edit enriched listing
- [ ] User can create wanted request
- [ ] User can make a bid on a listing

### Files to Create

```
src/app/auth/signin/page.tsx
src/app/auth/signup/page.tsx
src/app/agents/page.tsx
src/app/agents/new/page.tsx
src/app/agents/[id]/page.tsx
src/app/wanted/page.tsx
src/app/wanted/new/page.tsx
src/domain/agents/service.ts
src/domain/agents/validation.ts
src/domain/commands/parser.ts
src/domain/commands/executor.ts
src/lib/ai/openai.ts
src/lib/ai/enrichment.ts
src/components/command-input.tsx
src/components/agent-card.tsx
```

---

## Phase 3: Negotiations & Automation 🔮

**Goal**: Enable agent-to-agent negotiation with approval rules.

### To Build

#### Negotiation Engine
- [ ] Negotiation state machine
- [ ] Auto-negotiation service
- [ ] Rule evaluation engine
  - Auto-accept rules
  - Auto-reject rules
  - Auto-counter logic
- [ ] Negotiation thread UI
- [ ] Bid history timeline
- [ ] Message thread for context

#### Approval System
- [ ] Approval queue dashboard
- [ ] Notification system
- [ ] Email notifications
- [ ] In-app notifications
- [ ] Approval action handlers
  - Approve bid
  - Reject bid
  - Counter with different terms

#### Audit Logs
- [ ] Audit log viewer (admin)
- [ ] Audit log filters
- [ ] Entity-specific audit trails
- [ ] Agent action history
- [ ] Export audit logs

#### Notifications
- [ ] Notification preferences
- [ ] Real-time updates (SSE or WebSocket)
- [ ] Notification badge/count
- [ ] Mark as read functionality

### Test Criteria

- [ ] Agent can automatically counter bids within range
- [ ] Agent requires approval for edge cases
- [ ] User receives notification when approval needed
- [ ] User can view full negotiation history
- [ ] All agent actions are logged
- [ ] Audit trail is queryable

### Files to Create

```
src/domain/negotiations/engine.ts
src/domain/negotiations/rules.ts
src/domain/negotiations/service.ts
src/app/deals/page.tsx
src/app/deals/[id]/page.tsx
src/app/notifications/page.tsx
src/app/admin/audit-logs/page.tsx
src/components/negotiation-timeline.tsx
src/components/approval-card.tsx
src/lib/notifications/service.ts
```

---

## Phase 4: Orders & Transactions 💰

**Goal**: Handle order fulfillment, payments, and delivery.

### To Build

#### Order Management
- [ ] Order creation from accepted bid
- [ ] Order status tracking
- [ ] Order detail page
- [ ] Order list (buyer/seller views)
- [ ] Order domain service

#### Payment Integration
- [ ] Stripe setup and configuration
- [ ] Payment intent creation
- [ ] Payment confirmation webhook
- [ ] Refund handling
- [ ] Payment escrow logic
- [ ] Payment status updates

#### Delivery
- [ ] Delivery method selection
- [ ] Pickup coordination
- [ ] Delivery address management
- [ ] Mock delivery provider integration
- [ ] Tracking number system
- [ ] Delivery confirmation
- [ ] Delivery status updates

#### Dispute Resolution
- [ ] Dispute filing
- [ ] Dispute dashboard
- [ ] Admin dispute resolution
- [ ] Refund processing
- [ ] Dispute outcome notifications

### Test Criteria

- [ ] Accepted bid creates order
- [ ] Buyer can complete payment via Stripe
- [ ] Payment success triggers order status update
- [ ] Seller can mark item as shipped
- [ ] Buyer can confirm delivery
- [ ] Order completion triggers reputation updates
- [ ] Disputes can be filed and resolved

### Files to Create

```
src/domain/orders/service.ts
src/domain/orders/payment.ts
src/domain/orders/delivery.ts
src/app/orders/page.tsx
src/app/orders/[id]/page.tsx
src/app/api/webhooks/stripe/route.ts
src/components/order-card.tsx
src/components/payment-form.tsx
src/lib/stripe/client.ts
```

---

## Phase 5: Trust & Safety 🛡️

**Goal**: Implement comprehensive trust and safety systems.

### To Build

#### Trust Signals
- [ ] Email verification flow
- [ ] Phone verification (Twilio)
- [ ] ID verification (mock)
- [ ] Payment method verification
- [ ] Trust score calculation
- [ ] Trust badge display

#### Reputation System
- [ ] Reputation events (successful sales, disputes)
- [ ] Reputation score calculation
- [ ] Public reputation display
- [ ] Review/rating system
- [ ] Seller/buyer stats

#### Safety Engine
- [ ] Rate limiting middleware
- [ ] Duplicate listing detection
- [ ] Scam heuristics
  - Suspicious pricing checks
  - Description analysis
  - Rapid account checks
- [ ] Automated flagging
- [ ] User blocking/reporting

#### Moderation
- [ ] Moderation queue dashboard
- [ ] Flag/report system
- [ ] Moderation case management
- [ ] Moderation actions
  - Remove listing
  - Suspend user
  - Ban user
  - Warn user
- [ ] Appeal system
- [ ] Moderation analytics

### Test Criteria

- [ ] New users can verify email
- [ ] Trust score accurately reflects user activity
- [ ] Obvious scams are auto-flagged
- [ ] Moderators can review and resolve flags
- [ ] Banned users cannot access platform
- [ ] Rate limits prevent spam

### Files to Create

```
src/domain/trust/moderation.ts
src/domain/trust/reputation.ts
src/domain/trust/safety.ts
src/domain/trust/verification.ts
src/app/admin/moderation/page.tsx
src/app/admin/moderation/[id]/page.tsx
src/components/trust-badge.tsx
src/components/moderation-card.tsx
src/middleware/rate-limit.ts
```

---

## Phase 6: Polish & Production 🚀

**Goal**: Prepare for production deployment.

### To Build

#### Testing
- [ ] Unit tests for domain services
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Performance testing
- [ ] Load testing

#### Performance
- [ ] Image optimization
- [ ] Database query optimization
- [ ] Caching layer (Redis)
- [ ] CDN setup
- [ ] Bundle size optimization

#### Documentation
- [ ] API documentation (OpenAPI)
- [ ] User guide
- [ ] Agent configuration guide
- [ ] Admin manual
- [ ] Developer onboarding docs

#### Deployment
- [ ] Production environment setup
- [ ] CI/CD pipeline
- [ ] Monitoring (Sentry, LogRocket)
- [ ] Analytics (Plausible/PostHog)
- [ ] Backup strategy
- [ ] Disaster recovery plan

#### Polish
- [ ] Mobile responsiveness
- [ ] Accessibility (WCAG 2.1)
- [ ] Error boundaries
- [ ] Loading states
- [ ] Empty states
- [ ] Dark mode (optional)

### Test Criteria

- [ ] All critical paths have tests
- [ ] Lighthouse score > 90
- [ ] No console errors in production
- [ ] Monitoring alerts configured
- [ ] Documentation complete
- [ ] Deployment pipeline automated

---

## Future Enhancements (Post-MVP)

### External Marketplace Integration
- [ ] Craigslist integration
- [ ] Facebook Marketplace integration
- [ ] OfferUp integration
- [ ] Standardized listing format
- [ ] Cross-platform negotiation

### Advanced Agent Features
- [ ] Multi-agent coordination
- [ ] Agent learning from outcomes
- [ ] Custom agent personalities
- [ ] Agent performance analytics

### Federated Marketplace
- [ ] Open protocol for external agents
- [ ] Agent authentication system
- [ ] Cross-marketplace negotiations
- [ ] Reputation portability

### Mobile Apps
- [ ] React Native app
- [ ] Push notifications
- [ ] Camera integration for listings
- [ ] Location-based search

### Advanced Features
- [ ] Shipping label generation
- [ ] Insurance options
- [ ] Bulk listing tools
- [ ] Inventory management
- [ ] Business accounts
- [ ] API for third-party developers

---

## Development Guidelines

### Keep It Running
After each phase, the app must be fully functional:
- All existing features still work
- Database migrations are safe
- Tests pass
- No breaking changes without migration path

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Code review for PRs
- Documentation for complex logic

### Security First
- All inputs validated
- SQL injection prevention (Prisma handles this)
- XSS prevention
- CSRF protection
- Rate limiting on all public endpoints
- Audit logging for sensitive actions

### User Experience
- Clear error messages
- Loading states for async operations
- Optimistic UI updates where appropriate
- Responsive design
- Accessibility standards

---

**Current Phase**: Phase 1 ✅
**Next Phase**: Phase 2 - Agents & Commands
**Estimated Timeline**: 2-3 weeks per phase for a single developer
