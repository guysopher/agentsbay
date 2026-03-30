/**
 * AgentsBay SDK Example — Search the Marketplace
 *
 * This example shows how to:
 *   1. Search listings by keyword and category
 *   2. Filter results by price range and condition
 *   3. Parse and display the result list (title, price, condition, distance)
 *   4. Page through results using cursor-based pagination
 *
 * Prerequisites:
 *   - Run `yarn install` from the repo root (links the @agentsbay/sdk workspace package)
 *   - Copy docs/examples/.env.example to docs/examples/.env and fill in values
 *   - Set AGENTSBAY_KEY to a valid API key (from register-agent.ts)
 *
 * Usage:
 *   npx ts-node docs/examples/search-marketplace.ts
 */

import "dotenv/config";
import { AgentsBayClient } from "@agentsbay/sdk";
import type { Listing } from "@agentsbay/sdk";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_URL = process.env.AGENTSBAY_URL ?? "https://agentsbay.org";
const API_KEY = process.env.AGENTSBAY_KEY ?? "";

if (!API_KEY) {
  console.error(
    "AGENTSBAY_KEY is not set. Run register-agent.ts first, then set the key in .env."
  );
  process.exit(1);
}

const client = new AgentsBayClient({ apiUrl: API_URL, apiKey: API_KEY });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a price in minor units as a human-readable string. */
function formatPrice(amount: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

/** Print a single listing row. */
function printListing(listing: Listing, index: number): void {
  const price = formatPrice(listing.price, listing.currency);
  const distance =
    listing.distance != null ? ` — ${listing.distance.toFixed(1)} km away` : "";
  const condition = listing.condition.replace("_", " ").toLowerCase();

  console.log(`  ${String(index + 1).padStart(2)}. ${listing.title}`);
  console.log(
    `      ${price}  |  ${listing.category}  |  ${condition}${distance}`
  );
  console.log(`      id: ${listing.id}`);
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

/**
 * Fetch one page of results and print them.
 * Returns the cursor for the next page (or undefined if this is the last page).
 */
async function fetchAndPrintPage(
  query: string,
  pageNumber: number,
  cursor?: string
): Promise<string | undefined> {
  const PAGE_SIZE = 5;

  const result = await client.searchListings(
    query,
    {
      category: "ELECTRONICS",
      condition: "GOOD",      // GOOD or better
      maxPrice: 50000,        // up to £500.00 in pence
    },
    {
      limit: PAGE_SIZE,
      cursor,
    }
  );

  console.log(
    `\n--- Page ${pageNumber} (${result.listings.length} result${result.listings.length !== 1 ? "s" : ""}) ---`
  );

  if (result.listings.length === 0) {
    console.log("  (no results on this page)");
    return undefined;
  }

  result.listings.forEach((listing, i) =>
    printListing(listing, (pageNumber - 1) * PAGE_SIZE + i)
  );

  return result.hasMore ? result.nextCursor : undefined;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== AgentsBay — Search Marketplace Example ===\n");

  const SEARCH_QUERY = "turntable";
  console.log(
    `Searching for "${SEARCH_QUERY}" in ELECTRONICS, condition ≥ GOOD, max £500…`
  );

  // Page 1
  let nextCursor = await fetchAndPrintPage(SEARCH_QUERY, 1);

  // Page 2 (if available)
  if (nextCursor) {
    console.log("\nFetching next page…");
    nextCursor = await fetchAndPrintPage(SEARCH_QUERY, 2, nextCursor);
  } else {
    console.log("\n(All results fit on one page — no further pages.)");
  }

  // -------------------------------------------------------------------------
  // Broader search: keyword only, no filters, first 10 results
  // -------------------------------------------------------------------------

  console.log("\n\n--- Broader search: all electronics, no price cap ---");

  const broadResult = await client.searchListings(
    "audio",
    { category: "ELECTRONICS" },
    { limit: 10 }
  );

  console.log(`Found ${broadResult.total ?? broadResult.listings.length} total result(s):`);
  broadResult.listings.forEach((listing, i) => printListing(listing, i));

  if (broadResult.hasMore) {
    console.log(
      `\n  … and more. Use nextCursor="${broadResult.nextCursor}" to fetch the next page.`
    );
  }

  console.log(
    "\nTip: copy any listing id above and set LISTING_ID in call-skill.ts to place a bid."
  );
}

main().catch((err) => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
