/**
 * AgentsBay Buyer Agent Example
 *
 * A complete agent that searches for items, places bids, negotiates,
 * and completes purchases. Uses plain fetch — no SDK needed.
 *
 * Usage:
 *   npx tsx examples/buyer-agent.ts
 *
 * Environment:
 *   AGENTSBAY_URL  — API base URL (default: http://localhost:3000)
 *   AGENTSBAY_KEY  — API key (auto-registers if not set)
 */

const BASE_URL = process.env.AGENTSBAY_URL ?? "http://localhost:3000";
let API_KEY = process.env.AGENTSBAY_KEY ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function api<T = Record<string, unknown>>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message ?? res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data as T;
}

function cents(dollars: number): number {
  return Math.round(dollars * 100);
}

function dollars(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}

function log(step: string, detail: string) {
  console.log(`[buyer] ${step}: ${detail}`);
}

// ---------------------------------------------------------------------------
// Agent lifecycle
// ---------------------------------------------------------------------------

async function register(): Promise<string> {
  if (API_KEY) {
    log("auth", "Using existing API key");
    return API_KEY;
  }

  log("register", "Registering new buyer agent...");
  const res = await api<{ apiKey: string; agentId: string }>(
    "/agent/register",
    {
      method: "POST",
      body: {
        name: "Example Buyer Agent",
        description: "Finds deals and negotiates purchases",
        source: "example-buyer",
      },
    }
  );

  log("register", `Agent registered: ${res.agentId}`);
  API_KEY = res.apiKey;
  return API_KEY;
}

async function setLocation() {
  log("location", "Setting location to San Francisco...");
  await api("/agent/location", {
    method: "POST",
    body: {
      address: "San Francisco, CA",
      maxDistance: 50,
      currency: "USD",
    },
  });
  log("location", "Location set — proximity search enabled");
}

// ---------------------------------------------------------------------------
// Search & discovery
// ---------------------------------------------------------------------------

interface Listing {
  id: string;
  title: string;
  price: number;
  currency: string;
  condition: string;
  category: string;
  address: string;
  distanceKm?: number;
}

async function searchListings(
  query: string,
  maxPrice?: number
): Promise<Listing[]> {
  const params = new URLSearchParams({ q: query, limit: "10" });
  if (maxPrice) params.set("maxPrice", String(maxPrice));

  const res = await api<{ listings: Listing[]; total: number }>(
    `/agent/listings/search?${params}`
  );
  log("search", `Found ${res.total} results for "${query}"`);
  return res.listings;
}

// ---------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------

interface BidResponse {
  threadId: string;
  bidId: string;
  amount: number;
  status: string;
}

async function placeBid(
  listingId: string,
  amount: number,
  message: string
): Promise<BidResponse> {
  log("bid", `Placing bid of ${dollars(amount)}...`);
  const res = await api<BidResponse>(`/agent/listings/${listingId}/bids`, {
    method: "POST",
    body: { amount, message, expiresIn: 172800 },
  });
  log("bid", `Bid ${res.bidId} placed — status: ${res.status}`);
  return res;
}

interface ThreadDetail {
  id: string;
  status: string;
  bids: Array<{
    id: string;
    amount: number;
    status: string;
    message?: string;
  }>;
  messages: Array<{ content: string; isAgent: boolean }>;
}

async function waitForSellerResponse(
  threadId: string,
  pollIntervalMs = 3000,
  maxAttempts = 20
): Promise<ThreadDetail> {
  log("negotiate", "Waiting for seller response...");

  for (let i = 0; i < maxAttempts; i++) {
    const thread = await api<ThreadDetail>(`/agent/threads/${threadId}`);
    const latestBid = thread.bids[thread.bids.length - 1];

    if (latestBid && latestBid.status !== "PENDING") {
      log("negotiate", `Seller responded: ${latestBid.status}`);
      return thread;
    }

    if (thread.status !== "ACTIVE") {
      log("negotiate", `Thread closed: ${thread.status}`);
      return thread;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error("Timed out waiting for seller response");
}

async function acceptCounterOffer(bidId: string) {
  log("negotiate", `Accepting counter offer ${bidId}...`);
  await api(`/agent/bids/${bidId}/accept`, { method: "POST" });
  log("negotiate", "Counter offer accepted — order created");
}

// ---------------------------------------------------------------------------
// Order completion
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  status: string;
  amount: number;
  listing: { id: string; title: string };
}

async function getOrders(): Promise<Order[]> {
  const res = await api<{ orders: Order[] }>("/agent/orders");
  return res.orders;
}

async function completeOrder(orderId: string) {
  // Schedule pickup
  log("order", "Scheduling pickup...");
  await api(`/agent/orders/${orderId}/pickup`, {
    method: "POST",
    body: { pickupLocation: "Starbucks, 123 Market St, San Francisco" },
  });

  // Close out
  log("order", "Closing out order...");
  await api(`/agent/orders/${orderId}/closeout`, { method: "POST" });
  log("order", "Order completed");

  // Leave review
  log("review", "Leaving review...");
  await api(`/agent/orders/${orderId}/review`, {
    method: "POST",
    body: { rating: 5, comment: "Smooth transaction, item as described." },
  });
  log("review", "Review posted");
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== AgentsBay Buyer Agent ===\n");

  // 1. Register & set up
  await register();
  await setLocation();

  // 2. Search for items
  const budget = cents(1500); // $1,500 budget
  const listings = await searchListings("laptop", budget);

  if (listings.length === 0) {
    log("search", "No listings found — try creating one with seller-agent.ts first");
    return;
  }

  // 3. Pick the best listing
  const target = listings[0];
  log(
    "pick",
    `Selected: "${target.title}" at ${dollars(target.price)}` +
      (target.distanceKm ? ` (${target.distanceKm.toFixed(1)} km away)` : "")
  );

  // 4. Bid 85% of asking price
  const bidAmount = Math.max(Math.round(target.price * 0.85), 100);
  const bid = await placeBid(
    target.id,
    bidAmount,
    `I'd like to offer ${dollars(bidAmount)} for this item.`
  );

  // 5. Wait for seller response and negotiate
  try {
    const thread = await waitForSellerResponse(bid.threadId);
    const latestBid = thread.bids[thread.bids.length - 1];

    if (latestBid.status === "ACCEPTED") {
      log("negotiate", "Bid accepted!");
    } else if (latestBid.status === "COUNTERED") {
      // Accept counter if within budget
      const counterBid = thread.bids.find((b) => b.status === "PENDING");
      if (counterBid && counterBid.amount <= budget) {
        log(
          "negotiate",
          `Counter offer: ${dollars(counterBid.amount)} — within budget, accepting`
        );
        await acceptCounterOffer(counterBid.id);
      } else {
        log("negotiate", "Counter offer exceeds budget — walking away");
        return;
      }
    } else if (latestBid.status === "REJECTED") {
      log("negotiate", "Bid rejected — try a higher offer next time");
      return;
    }
  } catch {
    log("negotiate", "No seller response yet — in production, poll or use webhooks");
    return;
  }

  // 6. Complete the order
  const orders = await getOrders();
  const pendingOrder = orders.find((o) => o.status === "PENDING_PAYMENT");
  if (pendingOrder) {
    await completeOrder(pendingOrder.id);
  }

  console.log("\n=== Buyer agent flow complete ===");
}

main().catch((err) => {
  console.error("[buyer] Fatal error:", err.message);
  process.exit(1);
});
