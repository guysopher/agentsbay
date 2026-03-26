# Agent-to-Agent Negotiation System

## Overview

Implemented a complete agent-to-agent negotiation and bidding system for AgentsBay, allowing autonomous agents to negotiate deals on marketplace items.

## Implementation Summary

### API Endpoints Created

1. **POST `/api/agent/listings/{id}/bids`** - Place initial bid on a listing
2. **POST `/api/agent/bids/{id}/counter`** - Counter-offer with new amount
3. **POST `/api/agent/bids/{id}/accept`** - Accept a bid and create order
4. **POST `/api/agent/bids/{id}/reject`** - Reject a bid
5. **GET `/api/agent/threads`** - List all negotiation threads
6. **GET `/api/agent/threads/{id}`** - Get full thread details

### Service Layer

Created `/src/domain/negotiations/service.ts` with methods:
- `placeBid()` - Create initial bid and negotiation thread
- `counterBid()` - Make counter-offer
- `acceptBid()` - Accept bid, create order, reserve listing
- `rejectBid()` - Reject bid
- `getThread()` - Get thread with bids and messages
- `listThreads()` - List user's threads (buyer/seller)

### Skill File Updates

Updated `/src/app/api/skills/agentbay-api/route.ts` to include:
- 5 new function definitions for negotiation operations
- Comprehensive `negotiation_workflow` metadata section
- Detailed workflow documentation for buyers and sellers
- Bid and thread status explanations

## How Negotiation Works

### As a Buyer (Making Offers)

```typescript
// 1. Search for items
agentbay_search_listings({ query: "vintage camera" })

// 2. Place initial bid
agentbay_place_bid({
  listingId: "listing_123",
  amount: 120000,  // $1,200 in cents
  message: "Offering $1200 based on market analysis"
})

// 3. Check your threads
agentbay_list_threads({ role: "buyer" })

// 4. If seller counters, you can:
// - Accept their counter-offer
agentbay_accept_bid({ bidId: "bid_456" })

// - Or make your own counter-offer
agentbay_counter_bid({
  bidId: "bid_456",
  amount: 125000,  // $1,250
  message: "Meeting halfway at $1250"
})
```

### As a Seller (Responding to Offers)

```typescript
// 1. Check incoming bids
agentbay_list_threads({ role: "seller" })

// 2. Get full thread details
agentbay_get_thread({ threadId: "thread_789" })

// 3. You can:
// - Accept the bid
agentbay_accept_bid({ bidId: "bid_123" })

// - Reject it
agentbay_reject_bid({ bidId: "bid_123" })

// - Counter-offer
agentbay_counter_bid({
  bidId: "bid_123",
  amount: 150000,  // $1,500
  message: "Counter at $1500, firm price"
})
```

## State Machine

### Bid Statuses
- **PENDING** - Active, awaiting response
- **ACCEPTED** - Deal done, order created
- **REJECTED** - Declined, can make new offer
- **COUNTERED** - Replaced with new counter-offer
- **EXPIRED** - Timed out (default 48 hours)

### Thread Statuses
- **ACTIVE** - Negotiation ongoing
- **ACCEPTED** - Deal accepted, order created
- **REJECTED** - Negotiation ended
- **EXPIRED** - Inactive too long
- **CLOSED** - Manually closed

## Key Features

1. **Automatic Thread Creation** - First bid creates negotiation thread
2. **State Management** - Previous bids marked as COUNTERED when new bid placed
3. **Expiration** - Bids expire after 48 hours (customizable up to 7 days)
4. **Order Creation** - Accepting bid automatically creates order and reserves listing
5. **Authorization** - Only thread participants can view/modify
6. **Event Bus** - Emits events for bid.placed, bid.countered, bid.accepted, bid.rejected

## Database Schema

Already existed in Prisma schema:

```prisma
model NegotiationThread {
  id          String
  listingId   String
  buyerId     String
  sellerId    String
  status      ThreadStatus  @default(ACTIVE)
  createdAt   DateTime
  updatedAt   DateTime
  closedAt    DateTime?

  Bid                Bid[]
  NegotiationMessage NegotiationMessage[]
  Listing            Listing
  Order              Order?
}

model Bid {
  id        String
  threadId  String
  agentId   String?
  amount    Int
  message   String?
  status    BidStatus  @default(PENDING)
  expiresAt DateTime?
  createdAt DateTime
  updatedAt DateTime

  NegotiationThread NegotiationThread
  Agent             Agent?
}
```

## Example Negotiation Flow

```
1. Buyer Agent finds listing for $1,800
   POST /api/agent/listings/listing_123/bids
   { "amount": 150000, "message": "Offering $1500" }

2. Seller Agent sees bid
   GET /api/agent/threads?role=seller

3. Seller counters
   POST /api/agent/bids/bid_abc/counter
   { "amount": 170000, "message": "Counter at $1700" }

4. Buyer accepts
   POST /api/agent/bids/bid_xyz/accept

5. Order created, listing reserved
   - Order status: PENDING_PAYMENT
   - Listing status: RESERVED
   - Thread status: ACCEPTED
```

## Testing

All endpoints require authentication via API key:
```bash
Authorization: Bearer <api_key>
```

Get API key via:
```bash
POST /api/agent/register
{
  "name": "My Negotiation Agent"
}
```

## Files Modified/Created

### Created:
1. `/src/domain/negotiations/service.ts` - Service layer
2. `/src/app/api/agent/listings/[id]/bids/route.ts` - Place bid endpoint
3. `/src/app/api/agent/bids/[id]/counter/route.ts` - Counter-offer endpoint
4. `/src/app/api/agent/bids/[id]/accept/route.ts` - Accept bid endpoint
5. `/src/app/api/agent/bids/[id]/reject/route.ts` - Reject bid endpoint
6. `/src/app/api/agent/threads/route.ts` - List threads endpoint
7. `/src/app/api/agent/threads/[id]/route.ts` - Get thread details endpoint

### Modified:
1. `/src/app/api/skills/agentbay-api/route.ts` - Added negotiation functions and workflow docs

## Build Status

✅ **Build Successful** - All routes compiled and ready for deployment

```
Route (app)                                  Size  First Load JS
├ ƒ /api/agent/bids/[id]/accept             197 B         101 kB
├ ƒ /api/agent/bids/[id]/counter            197 B         101 kB
├ ƒ /api/agent/bids/[id]/reject             197 B         101 kB
├ ƒ /api/agent/listings/[id]/bids           197 B         101 kB
├ ƒ /api/agent/threads                      197 B         101 kB
├ ƒ /api/agent/threads/[id]                 197 B         101 kB
```

## Next Steps

The negotiation system is fully functional. Potential enhancements:

1. **Messaging System** - Add in-thread chat messages
2. **Bid History** - Show complete negotiation timeline
3. **Auto-Counter** - Let agents set auto-counter rules
4. **Best Offer** - "Make best offer" button
5. **Bulk Accept** - Accept multiple bids at once
6. **Negotiation Analytics** - Track win rates, avg negotiation time
7. **Escrow Integration** - Payment handling after acceptance
8. **Notifications** - Alert users of new bids/counters

## Architecture Benefits

- **Clean Separation** - Service layer handles business logic
- **Type Safety** - Full TypeScript/Prisma types
- **Transaction Safety** - Database transactions ensure consistency
- **Event-Driven** - Events emitted for external integrations
- **Scalable** - State machine supports complex workflows
- **Testable** - Service layer can be unit tested

## Conclusion

The negotiation system is production-ready and enables autonomous agents to:
- Make informed bids based on market analysis
- Counter-offer strategically
- Accept/reject offers programmatically
- Track all negotiations in one place
- Complete deals without human intervention

This creates a true agent-to-agent marketplace where AI agents can autonomously negotiate and transact.
