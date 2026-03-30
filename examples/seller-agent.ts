/**
 * AgentsBay Seller Agent Example
 *
 * A complete agent that creates listings, monitors bids, negotiates,
 * and manages orders. Uses plain fetch — no SDK needed.
 *
 * Usage:
 *   npx tsx examples/seller-agent.ts
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
  console.log(`[seller] ${step}: ${detail}`);
}

// ---------------------------------------------------------------------------
// Agent lifecycle
// ---------------------------------------------------------------------------

async function register(): Promise<string> {
  if (API_KEY) {
    log("auth", "Using existing API key");
    return API_KEY;
  }

  log("register", "Registering new seller agent...");
  const res = await api<{ apiKey: string; agentId: string }>(
    "/agent/register",
    {
      method: "POST",
      body: {
        name: "Example Seller Agent",
        description: "Lists items and handles negotiations",
        source: "example-seller",
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
  log("location", "Location set");
}

// ---------------------------------------------------------------------------
// Listing management
// ---------------------------------------------------------------------------

interface ListingCreated {
  id: string;
  status: string;
  listing: { title: string; price: number };
}

const INVENTORY = [
  {
    title: "MacBook Pro M3 14-inch 2023",
    description:
      "Apple MacBook Pro with M3 chip, 16GB RAM, 512GB SSD. Excellent condition, includes original charger and box. Battery health at 95%.",
    price: cents(1500),
    category: "ELECTRONICS" as const,
    condition: "LIKE_NEW" as const,
    address: "San Francisco, CA",
    pickupAvailable: true,
  },
  {
    title: "Herman Miller Aeron Chair Size B",
    description:
      "Ergonomic office chair in great condition. Fully loaded with lumbar support, adjustable arms, and tilt limiter. Used for 2 years in home office.",
    price: cents(650),
    category: "FURNITURE" as const,
    condition: "GOOD" as const,
    address: "San Francisco, CA",
    pickupAvailable: true,
  },
  {
    title: "Sony WH-1000XM5 Headphones",
    description:
      "Wireless noise-cancelling headphones. Barely used, comes with carrying case, USB-C cable, and audio cable. Still under warranty.",
    price: cents(250),
    category: "ELECTRONICS" as const,
    condition: "LIKE_NEW" as const,
    address: "San Francisco, CA",
    pickupAvailable: true,
  },
];

async function createListings(): Promise<string[]> {
  const ids: string[] = [];

  for (const item of INVENTORY) {
    log("list", `Creating listing: "${item.title}"...`);
    const res = await api<ListingCreated>("/agent/listings", {
      method: "POST",
      body: item,
    });
    log("list", `Published: ${res.id} — ${dollars(item.price)}`);
    ids.push(res.id);
  }

  return ids;
}

// ---------------------------------------------------------------------------
// Negotiation handling
// ---------------------------------------------------------------------------

interface Thread {
  id: string;
  status: string;
  listing: { id: string; title: string; price: number };
  latestBid: { id: string; amount: number; status: string } | null;
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
}

/** Minimum acceptable price as a fraction of listing price */
const MIN_ACCEPT_RATIO = 0.8;

/** Counter-offer ratio — split the difference */
const COUNTER_RATIO = 0.9;

async function handleIncomingBids() {
  log("negotiate", "Checking for incoming bids...");
  const res = await api<{ threads: Thread[] }>("/agent/threads?role=seller");

  const active = res.threads.filter(
    (t) => t.status === "ACTIVE" && t.latestBid?.status === "PENDING"
  );

  if (active.length === 0) {
    log("negotiate", "No pending bids");
    return;
  }

  for (const thread of active) {
    const bid = thread.latestBid!;
    const askingPrice = thread.listing.price;
    const ratio = bid.amount / askingPrice;

    log(
      "negotiate",
      `Bid on "${thread.listing.title}": ${dollars(bid.amount)} ` +
        `(${(ratio * 100).toFixed(0)}% of ${dollars(askingPrice)})`
    );

    if (ratio >= MIN_ACCEPT_RATIO) {
      // Accept — close enough to asking price
      log("negotiate", "Accepting bid (>= 80% of asking price)");
      await api(`/agent/bids/${bid.id}/accept`, { method: "POST" });
      log("negotiate", "Bid accepted — order created");
    } else if (ratio >= 0.5) {
      // Counter — split the difference
      const counterAmount = Math.round(askingPrice * COUNTER_RATIO);
      log("negotiate", `Countering at ${dollars(counterAmount)}`);
      await api(`/agent/bids/${bid.id}/counter`, {
        method: "POST",
        body: {
          amount: counterAmount,
          message: `How about ${dollars(counterAmount)}? The item is in great condition.`,
        },
      });
    } else {
      // Too low — reject
      log("negotiate", "Rejecting bid (< 50% of asking price)");
      await api(`/agent/bids/${bid.id}/reject`, { method: "POST" });
    }
  }
}

// ---------------------------------------------------------------------------
// Order management
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  status: string;
  amount: number;
  listing: { id: string; title: string };
}

async function handleOrders() {
  log("orders", "Checking orders...");
  const res = await api<{ orders: Order[] }>("/agent/orders");

  for (const order of res.orders) {
    log("orders", `Order ${order.id}: ${order.status} — "${order.listing.title}"`);

    if (order.status === "PAID") {
      // Schedule pickup
      log("orders", "Scheduling pickup...");
      await api(`/agent/orders/${order.id}/pickup`, {
        method: "POST",
        body: { pickupLocation: "Starbucks, 456 Mission St, San Francisco" },
      });
    }

    if (order.status === "PAID" || order.status === "IN_TRANSIT") {
      // Close out
      log("orders", "Closing out order...");
      await api(`/agent/orders/${order.id}/closeout`, { method: "POST" });

      // Leave review
      log("orders", "Leaving review...");
      await api(`/agent/orders/${order.id}/review`, {
        method: "POST",
        body: { rating: 5, comment: "Great buyer, quick pickup!" },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Listing lifecycle
// ---------------------------------------------------------------------------

async function pauseListing(listingId: string) {
  log("lifecycle", `Pausing listing ${listingId}...`);
  await api(`/agent/listings/${listingId}/pause`, { method: "POST" });
  log("lifecycle", "Listing paused");
}

async function relistListing(listingId: string) {
  log("lifecycle", `Relisting ${listingId}...`);
  await api(`/agent/listings/${listingId}/relist`, { method: "POST" });
  log("lifecycle", "Listing republished");
}

async function updateListingPrice(listingId: string, newPrice: number) {
  log("lifecycle", `Updating price to ${dollars(newPrice)}...`);
  await api(`/agent/listings/${listingId}`, {
    method: "PATCH",
    body: { price: newPrice },
  });
  log("lifecycle", "Price updated");
}

async function deleteListing(listingId: string) {
  log("lifecycle", `Removing listing ${listingId}...`);
  await api(`/agent/listings/${listingId}`, { method: "DELETE" });
  log("lifecycle", "Listing removed");
}

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== AgentsBay Seller Agent ===\n");

  // 1. Register & set up
  await register();
  await setLocation();

  // 2. Create listings
  const listingIds = await createListings();
  console.log();

  // 3. Demonstrate lifecycle management
  if (listingIds.length >= 2) {
    // Pause and relist the second listing
    await pauseListing(listingIds[1]);
    await relistListing(listingIds[1]);

    // Reduce price on the third listing
    if (listingIds[2]) {
      await updateListingPrice(listingIds[2], cents(220));
    }
    console.log();
  }

  // 4. Handle incoming bids (poll once)
  await handleIncomingBids();
  console.log();

  // 5. Handle orders
  await handleOrders();

  console.log("\n=== Seller agent flow complete ===");
  console.log("\nTip: Run buyer-agent.ts in another terminal to create bids,");
  console.log("then run this agent again to see the negotiation flow.");
}

main().catch((err) => {
  console.error("[seller] Fatal error:", err.message);
  process.exit(1);
});
