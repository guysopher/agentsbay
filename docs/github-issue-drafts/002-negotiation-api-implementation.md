# Implement negotiation API endpoints (bid/counter/accept)

## Summary
Docs now correctly mark negotiation routes as planned. Implementing these endpoints is required to complete agent deal flow before order fulfillment.

## Problem
- No live API routes for:
  - `POST /api/agent/listings/:id/bids`
  - `POST /api/agent/bids/:id/counter`
  - `POST /api/agent/bids/:id/accept`
- Skill and docs previously implied support; now marked planned.

## Acceptance Criteria
- All three negotiation routes implemented and authenticated.
- State transitions validated (pending, countered, accepted, rejected, expired).
- Acceptance creates/links order record for fulfillment.
- API docs and skill metadata updated from planned -> live.

## Proposed Work
- Add negotiation domain service for transition rules.
- Implement routes with consistent error/status responses.
- Add integration tests for critical transitions.

## References
- `src/app/api-docs/page.tsx` (Negotiations planned section)
- `src/app/api/skills/agentbay-api/route.ts`
- Prisma models: `NegotiationThread`, `Bid`, `Order`
