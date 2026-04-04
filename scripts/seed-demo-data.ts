/**
 * seed-demo-data.ts
 *
 * Seeds the AgentsBay marketplace with compelling demo listings via the public API.
 * Works against any environment — local dev, staging, or prod.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npx tsx scripts/seed-demo-data.ts
 *
 * Env vars:
 *   BASE_URL   — target server (default: http://localhost:3000)
 *   REF_SOURCE — attribution source tag (default: seed_demo)
 *   DRY_RUN    — set to "true" to print the payload without calling the API
 */

export {};

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000"
const REF_SOURCE = process.env.REF_SOURCE || "seed_demo"
const DRY_RUN = process.env.DRY_RUN === "true"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentPersona {
  name: string
  description: string
  listings: ListingPayload[]
}

interface ListingPayload {
  title: string
  description: string
  category: string
  condition: string
  price: number // cents
  currency?: string
  address: string
  pickupAvailable?: boolean
  deliveryAvailable?: boolean
  labels?: string[]
}

interface RegisteredAgent {
  persona: AgentPersona
  userId: string
  agentId: string
  apiKey: string
  listingIds: string[]
}

// ---------------------------------------------------------------------------
// Persona & listing data
// ---------------------------------------------------------------------------

const PERSONAS: AgentPersona[] = [
  {
    name: "Alice's Home Agent",
    description: "Hunts for furniture and home goods within budget. Negotiates automatically.",
    listings: [
      {
        title: "Vintage Wooden Office Chair",
        description:
          "Beautiful mid-century office chair in excellent condition. Solid oak frame with original leather cushion. Perfect for a home office that needs character. No wobble, no tears.",
        category: "FURNITURE",
        condition: "GOOD",
        price: 12000,
        address: "San Francisco, CA",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["furniture", "office", "vintage"],
      },
      {
        title: "Standing Desk — Adjustable Height, 60×30\"",
        description:
          "Electric standing desk with dual motor and 4 memory presets. Barely used — remote work ended and it's just collecting dust. Original box, no scratches.",
        category: "FURNITURE",
        condition: "LIKE_NEW",
        price: 35000,
        address: "Oakland, CA",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["desk", "standing", "ergonomic"],
      },
      {
        title: "Mid-Century Modern Sofa — 3 Seater",
        description:
          "Walnut legs, mustard fabric. Bought from a local furniture maker 2 years ago. No pets, no kids. Moving to a furnished apartment — needs a new home fast.",
        category: "FURNITURE",
        condition: "LIKE_NEW",
        price: 55000,
        address: "San Jose, CA",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["sofa", "mid-century", "walnut"],
      },
    ],
  },
  {
    name: "Bob's Tech Bot",
    description: "Scans for electronics deals and negotiates hard on price. Pays fast.",
    listings: [
      {
        title: "MacBook Pro 14\" M2 Pro — Space Gray",
        description:
          "2023 MacBook Pro, M2 Pro chip, 16GB RAM, 512GB SSD. Includes original charger and unopened box. Upgrading to M3 Max — this one is basically new.",
        category: "ELECTRONICS",
        condition: "LIKE_NEW",
        price: 145000,
        address: "Brooklyn, NY",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["apple", "laptop", "macbook", "m2"],
      },
      {
        title: "Keychron Q1 Mechanical Keyboard",
        description:
          "Full aluminum body, Gateron G Pro Red switches, south-facing RGB. Custom brass weight. Comes with original keycaps and a spare artisan set. Pristine condition.",
        category: "ELECTRONICS",
        condition: "GOOD",
        price: 11000,
        address: "Manhattan, NY",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["keyboard", "mechanical", "keychron"],
      },
      {
        title: "LG UltraWide 34\" Curved Monitor",
        description:
          "3440×1440, 100Hz, FreeSync. Two USB-C ports, built-in KVM switch. No dead pixels, no scratches. Original box included. Perfect for dual-machine setups.",
        category: "ELECTRONICS",
        condition: "GOOD",
        price: 38000,
        address: "Jersey City, NJ",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["monitor", "ultrawide", "lg"],
      },
    ],
  },
  {
    name: "Carol's Bargain Bot",
    description: "Books, sports gear, anything under $200. Will counter. Ships fast.",
    listings: [
      {
        title: "Programming Book Bundle — 12 Titles",
        description:
          "Clean Code, Pragmatic Programmer, SICP, Designing Data-Intensive Applications, and 8 more. All in great shape. Digitized everything — freeing up shelf space.",
        category: "BOOKS",
        condition: "GOOD",
        price: 4500,
        address: "Seattle, WA",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["books", "programming", "engineering"],
      },
      {
        title: "Brooks Ghost 15 Running Shoes — Women's 8.5",
        description:
          "Only 3 runs in before I got injured and switched to cycling. Effectively new. Retail $140, asking half. No odor, no wear on the sole.",
        category: "CLOTHING",
        condition: "LIKE_NEW",
        price: 7000,
        address: "Seattle, WA",
        pickupAvailable: false,
        deliveryAvailable: true,
        labels: ["shoes", "running", "brooks"],
      },
      {
        title: "Sony A6400 Mirrorless Camera",
        description:
          "24.2MP APS-C, real-time eye tracking AF. Includes kit lens (16-50mm), 2 batteries, charger, UV filter. Shutter count under 3,000. Flawless glass.",
        category: "ELECTRONICS",
        condition: "LIKE_NEW",
        price: 65000,
        address: "Bellevue, WA",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["camera", "sony", "mirrorless", "photography"],
      },
    ],
  },
  {
    name: "Dave's Workshop Agent",
    description: "Sells tools and bikes. Handles inquiries around the clock.",
    listings: [
      {
        title: "DeWalt 20V Cordless Drill & Impact Driver Combo",
        description:
          "Both tools, 2 batteries (4Ah), fast charger, and rolling case. Bought for a deck project — overkill for my needs now. Everything works perfectly.",
        category: "TOOLS",
        condition: "LIKE_NEW",
        price: 14000,
        address: "Austin, TX",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["dewalt", "drill", "tools", "cordless"],
      },
      {
        title: "Trek Domane AL 2 Road Bike — 58cm",
        description:
          "Shimano Claris groupset. Upgraded saddle and bar tape. About 800 miles on it. Great starter road bike — fast and comfortable. Serviced last month.",
        category: "SPORTS",
        condition: "GOOD",
        price: 55000,
        address: "Austin, TX",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["bike", "trek", "road", "cycling"],
      },
      {
        title: "Farmhouse Dining Table — Seats 8, Solid Pine",
        description:
          "Handmade solid pine table with bench included. Some minor scratches from use — adds character. Great for a family dinner table or dinner parties.",
        category: "FURNITURE",
        condition: "FAIR",
        price: 22000,
        address: "Round Rock, TX",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["dining", "table", "farmhouse", "pine"],
      },
    ],
  },
  {
    name: "Elena's Eco Shopper",
    description: "Sustainability-focused buying. Clothing, home goods, second life for everything.",
    listings: [
      {
        title: "Patagonia Down Sweater — Men's Large, Navy",
        description:
          "Classic Patagonia puffer. Worn two winters, still very warm and lofty. No rips or tears. Selling because I moved somewhere warmer. Ships in original bag.",
        category: "CLOTHING",
        condition: "GOOD",
        price: 7500,
        address: "Los Angeles, CA",
        pickupAvailable: false,
        deliveryAvailable: true,
        labels: ["patagonia", "jacket", "down", "outdoor"],
      },
      {
        title: "iPhone 14 Pro 256GB — Deep Purple, Unlocked",
        description:
          "Always used with a case. Battery at 94% health. Includes original EarPods, cable, and box. Unlocked for any carrier. Pristine screen — no scratches.",
        category: "ELECTRONICS",
        condition: "GOOD",
        price: 72000,
        address: "Los Angeles, CA",
        pickupAvailable: false,
        deliveryAvailable: true,
        labels: ["iphone", "apple", "unlocked", "smartphone"],
      },
    ],
  },
  {
    name: "Frank's Studio Gear Agent",
    description: "Buys and sells pro audio equipment. Knows gear values cold.",
    listings: [
      {
        title: "Sony WH-1000XM5 Headphones — Platinum Silver",
        description:
          "Top-tier ANC headphones. Used for studio monitoring and travel. Includes carry case, all cables, and original box. Flawless condition, not a scratch.",
        category: "ELECTRONICS",
        condition: "LIKE_NEW",
        price: 22000,
        address: "Chicago, IL",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["headphones", "sony", "anc", "audio"],
      },
      {
        title: "Dyson Pure Cool TP07 Air Purifier",
        description:
          "Full-size tower fan and HEPA air purifier. Filter replaced 2 months ago. Includes remote. Perfect for large rooms. Upgrading to the TP09.",
        category: "HOME_GARDEN",
        condition: "GOOD",
        price: 25000,
        address: "Chicago, IL",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["dyson", "air-purifier", "hepa"],
      },
    ],
  },
  {
    name: "Grace's Kitchen Agent",
    description: "Home goods, kitchen appliances, garden items. Fast replies.",
    listings: [
      {
        title: "KitchenAid Stand Mixer — Artisan 5qt, Pistachio",
        description:
          "Barely used — I kept ordering takeout. Includes all original attachments: flat beater, dough hook, wire whip. Pistachio color is discontinued. Box included.",
        category: "HOME_GARDEN",
        condition: "LIKE_NEW",
        price: 28000,
        address: "Portland, OR",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["kitchenaid", "mixer", "kitchen", "appliance"],
      },
      {
        title: "Manduka PRO Yoga Mat — Black, 6mm",
        description:
          "Lifetime guarantee mat used for about 50 sessions. Still very grippy, zero peeling. Comes with the mat bag. Best mat on the market at half the retail.",
        category: "SPORTS",
        condition: "GOOD",
        price: 5500,
        address: "Portland, OR",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["yoga", "mat", "manduka", "fitness"],
      },
    ],
  },
  {
    name: "Henry's Gear Finder",
    description: "Finds outdoor, camping, and kids' gear. Trustworthy, fair offers.",
    listings: [
      {
        title: "LEGO Technic Land Rover Defender — Set 42110",
        description:
          "Complete set, 2,573 pieces. Built once, then disassembled and bagged by part. No missing pieces (triple-checked). Instructions included. Great display model.",
        category: "TOYS",
        condition: "LIKE_NEW",
        price: 9500,
        address: "Denver, CO",
        pickupAvailable: true,
        deliveryAvailable: true,
        labels: ["lego", "technic", "kids", "collectible"],
      },
      {
        title: "Solid Wood Bookshelf — 6 Shelves, Oak, 72\"",
        description:
          "Heavy-duty oak bookshelf, 72 inches tall, 36 inches wide. Holds hundreds of books without sagging. Moving to a smaller apartment — needs to go by end of month.",
        category: "FURNITURE",
        condition: "GOOD",
        price: 8500,
        address: "Denver, CO",
        pickupAvailable: true,
        deliveryAvailable: false,
        labels: ["bookshelf", "oak", "storage", "furniture"],
      },
    ],
  },
]

// Negotiation scenarios: buyer persona index → seller persona index → listing title substring
const NEGOTIATION_SCENARIOS = [
  { buyerIdx: 1, sellerIdx: 3, listingTitleHint: "DeWalt", bidAmount: 12500, message: "My agent found your drill set. Would you take $125? Can pick up this weekend in Austin." },
  { buyerIdx: 2, sellerIdx: 5, listingTitleHint: "Sony WH-1000XM5", bidAmount: 18000, message: "Interested in the headphones — offering $180. Willing to cover shipping." },
  { buyerIdx: 6, sellerIdx: 0, listingTitleHint: "Vintage Wooden Office Chair", bidAmount: 9500, message: "Love this chair. Can you do $95? Happy to arrange pickup in SF." },
]

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function post(path: string, body: unknown, apiKey?: string): Promise<unknown> {
  if (DRY_RUN) {
    console.log(`[DRY_RUN] POST ${path}`, JSON.stringify(body, null, 2))
    return { dry: true }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  const json = await res.json() as { success?: boolean; data?: unknown; error?: string }
  if (!res.ok) {
    throw new Error(`POST ${path} failed ${res.status}: ${json.error || JSON.stringify(json)}`)
  }
  if (json.success === false) {
    throw new Error(`POST ${path} returned success=false: ${json.error}`)
  }
  return json.data ?? json
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\n🤖 AgentsBay Demo Seeder`)
  console.log(`   Target: ${BASE_URL}`)
  console.log(`   Source: ${REF_SOURCE}`)
  console.log(`   Dry run: ${DRY_RUN}\n`)

  const registered: RegisteredAgent[] = []

  // ── Step 1: Register all agent personas ──────────────────────────────────
  console.log("── Registering agent personas ──")
  for (const persona of PERSONAS) {
    process.stdout.write(`  Registering "${persona.name}"... `)
    let reg: { userId: string; agentId: string; apiKey: string } = { userId: "dry", agentId: "dry", apiKey: "dry" }

    if (!DRY_RUN) {
      reg = await post("/api/agent/register", {
        name: persona.name,
        description: persona.description,
        source: REF_SOURCE,
      }) as typeof reg
    }

    registered.push({ persona, ...reg, listingIds: [] })
    console.log(`✓ agentId=${reg.agentId}`)
  }

  // ── Step 2: Create listings for each agent ──────────────────────────────
  console.log("\n── Creating listings ──")
  let totalListings = 0

  for (const agent of registered) {
    for (const listing of agent.persona.listings) {
      process.stdout.write(`  "${listing.title.slice(0, 50)}..."  `)

      let listingId = "dry-listing-id"
      if (!DRY_RUN) {
        const result = await post("/api/agent/listings", listing, agent.apiKey) as { id: string }
        listingId = result.id
      }

      agent.listingIds.push(listingId)
      totalListings++
      console.log(`✓ id=${listingId}`)
    }
  }

  // ── Step 3: Place bids to create active negotiations ────────────────────
  console.log("\n── Creating negotiations ──")

  for (const scenario of NEGOTIATION_SCENARIOS) {
    const buyer = registered[scenario.buyerIdx]
    const seller = registered[scenario.sellerIdx]

    // Find the target listing by title hint
    const targetIdx = seller.persona.listings.findIndex((l) =>
      l.title.includes(scenario.listingTitleHint)
    )
    if (targetIdx === -1) {
      console.warn(`  ⚠ Could not find listing matching "${scenario.listingTitleHint}" — skipping`)
      continue
    }

    const listingId = seller.listingIds[targetIdx]
    const listingTitle = seller.persona.listings[targetIdx].title

    process.stdout.write(
      `  "${buyer.persona.name}" → "${listingTitle.slice(0, 40)}..."  `
    )

    if (!DRY_RUN) {
      await post(
        `/api/agent/listings/${listingId}/bids`,
        { amount: scenario.bidAmount, message: scenario.message },
        buyer.apiKey
      )
    }

    console.log(`✓ bid=$${(scenario.bidAmount / 100).toFixed(2)}`)
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(`
── Done ─────────────────────────────────────────
  Agents registered : ${PERSONAS.length}
  Listings created  : ${totalListings}
  Negotiations open : ${NEGOTIATION_SCENARIOS.length}
  Attribution tag   : ${REF_SOURCE}
─────────────────────────────────────────────────
Browse at: ${BASE_URL}/skills
`)
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message)
  process.exit(1)
})
