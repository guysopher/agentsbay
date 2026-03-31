import {
  PrismaClient,
  ListingCategory,
  ItemCondition,
  ListingStatus,
  SkillCategory,
  ThreadStatus,
  BidStatus,
  OrderStatus,
  FulfillmentMethod,
  WantedStatus,
} from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")
  const now = new Date()
  const hashedPassword = await bcrypt.hash("password123", 10)

  // ============================================================
  // USERS (6 diverse users with profiles)
  // ============================================================

  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: { name: "Alice Johnson", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-alice",
      email: "alice@example.com",
      name: "Alice Johnson",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-alice",
          displayName: "Alice J.",
          location: "San Francisco, CA",
          bio: "Interior design enthusiast. Love giving furniture a second life.",
          updatedAt: now,
        },
      },
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: { name: "Bob Smith", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-bob",
      email: "bob@example.com",
      name: "Bob Smith",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-bob",
          displayName: "Bob S.",
          location: "New York, NY",
          bio: "Tech enthusiast and gadget collector. Upgrading constantly.",
          updatedAt: now,
        },
      },
    },
  })

  const user3 = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: { name: "Carol Chen", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-carol",
      email: "carol@example.com",
      name: "Carol Chen",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-carol",
          displayName: "Carol C.",
          location: "Seattle, WA",
          bio: "Avid reader and trail runner. Always looking for a deal.",
          updatedAt: now,
        },
      },
    },
  })

  const user4 = await prisma.user.upsert({
    where: { email: "dave@example.com" },
    update: { name: "Dave Martinez", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-dave",
      email: "dave@example.com",
      name: "Dave Martinez",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-dave",
          displayName: "Dave M.",
          location: "Austin, TX",
          bio: "DIY woodworker and cyclist. Quality tools, fair prices.",
          updatedAt: now,
        },
      },
    },
  })

  const user5 = await prisma.user.upsert({
    where: { email: "elena@example.com" },
    update: { name: "Elena Park", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-elena",
      email: "elena@example.com",
      name: "Elena Park",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-elena",
          displayName: "Elena P.",
          location: "Los Angeles, CA",
          bio: "Sustainability advocate. Buy used, waste less.",
          updatedAt: now,
        },
      },
    },
  })

  const user6 = await prisma.user.upsert({
    where: { email: "frank@example.com" },
    update: { name: "Frank Wu", password: hashedPassword, emailVerified: now, updatedAt: now },
    create: {
      id: "user-frank",
      email: "frank@example.com",
      name: "Frank Wu",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        create: {
          id: "profile-frank",
          displayName: "Frank W.",
          location: "Chicago, IL",
          bio: "Home studio producer. Gear rotation is part of the process.",
          updatedAt: now,
        },
      },
    },
  })

  console.log("Created 6 users")

  // ============================================================
  // AGENTS
  // ============================================================

  await prisma.agent.upsert({
    where: { id: "agent-alice-shopping" },
    update: { updatedAt: now },
    create: {
      id: "agent-alice-shopping",
      userId: user1.id,
      name: "Alice's Shopping Agent",
      description: "Hunts for furniture and home goods under budget",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 50000,
      minAcceptAmount: 5000,
      maxAcceptAmount: 100000,
      requireApproval: false,
      preferredLocation: "San Francisco Bay Area",
      maxDistance: 50,
    },
  })

  await prisma.agent.upsert({
    where: { id: "agent-bob-tech" },
    update: { updatedAt: now },
    create: {
      id: "agent-bob-tech",
      userId: user2.id,
      name: "Bob's Tech Agent",
      description: "Finds electronics, negotiates hard on price",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 200000,
      requireApproval: true,
      preferredLocation: "New York",
    },
  })

  await prisma.agent.upsert({
    where: { id: "agent-carol-bargain" },
    update: { updatedAt: now },
    create: {
      id: "agent-carol-bargain",
      userId: user3.id,
      name: "Carol's Bargain Bot",
      description: "Books, sports gear, anything under $100",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 10000,
      requireApproval: false,
      preferredLocation: "Seattle, WA",
      maxDistance: 30,
    },
  })

  await prisma.agent.upsert({
    where: { id: "agent-dave-seller" },
    update: { updatedAt: now },
    create: {
      id: "agent-dave-seller",
      userId: user4.id,
      name: "Dave's Selling Agent",
      description: "Lists tools and bikes, handles inquiries",
      updatedAt: now,
      autoNegotiate: true,
      minAcceptAmount: 2000,
      maxAcceptAmount: 80000,
      requireApproval: false,
      preferredLocation: "Austin, TX",
    },
  })

  await prisma.agent.upsert({
    where: { id: "agent-elena-eco" },
    update: { updatedAt: now },
    create: {
      id: "agent-elena-eco",
      userId: user5.id,
      name: "Elena's Eco Agent",
      description: "Sustainable shopping — clothing and home goods",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 15000,
      requireApproval: false,
      preferredLocation: "Los Angeles, CA",
      maxDistance: 40,
    },
  })

  await prisma.agent.upsert({
    where: { id: "agent-frank-studio" },
    update: { updatedAt: now },
    create: {
      id: "agent-frank-studio",
      userId: user6.id,
      name: "Frank's Studio Agent",
      description: "Buys and sells audio gear and electronics",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 120000,
      requireApproval: true,
      preferredLocation: "Chicago, IL",
    },
  })

  console.log("Created 6 agents")

  // ============================================================
  // LISTINGS (18 across diverse categories)
  // ============================================================

  const listings = [
    // FURNITURE (5)
    {
      id: "listing-vintage-chair",
      userId: user1.id,
      agentId: "agent-alice-shopping",
      title: "Vintage Wooden Office Chair",
      description: "Beautiful mid-century office chair in excellent condition. Solid oak frame with original leather cushion. Perfect for a home office that needs character.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.GOOD,
      price: 12000,
      address: "San Francisco, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-standing-desk",
      userId: user1.id,
      agentId: "agent-alice-shopping",
      title: "Standing Desk — Adjustable Height",
      description: "Electric standing desk with dual motor and 4 memory presets. 60×30 inches. Barely used — remote work ended and now it's just taking up space.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.LIKE_NEW,
      price: 35000,
      address: "Oakland, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-bookshelf",
      userId: user3.id,
      agentId: "agent-carol-bargain",
      title: "Solid Wood Bookshelf — 6 Shelves",
      description: "Heavy-duty oak bookshelf, 72 inches tall. Holds hundreds of books without sagging. Moving to a smaller apartment, needs to go.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.GOOD,
      price: 8500,
      address: "Seattle, WA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-sofa",
      userId: user5.id,
      agentId: "agent-elena-eco",
      title: "Mid-Century Modern Sofa — 3 Seater",
      description: "Walnut legs, mustard fabric. Bought from a local furniture maker 2 years ago. No pets, no kids. Moving to a furnished place.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.LIKE_NEW,
      price: 55000,
      address: "Los Angeles, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-dining-table",
      userId: user4.id,
      agentId: "agent-dave-seller",
      title: "Farmhouse Dining Table — Seats 8",
      description: "Solid pine dining table with bench. Handmade. Some minor scratches from use — adds character. Great for a family or dinner parties.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.FAIR,
      price: 22000,
      address: "Austin, TX",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    // ELECTRONICS (6)
    {
      id: "listing-macbook-pro",
      userId: user2.id,
      agentId: "agent-bob-tech",
      title: "MacBook Pro 14\" M2 Pro",
      description: "2023 MacBook Pro, M2 Pro chip, 16GB RAM, 512GB SSD. Space Gray. Includes original charger and box. Upgrading to M3 Max.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.LIKE_NEW,
      price: 145000,
      address: "Brooklyn, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-mechanical-keyboard",
      userId: user2.id,
      agentId: "agent-bob-tech",
      title: "Keychron Q1 Mechanical Keyboard",
      description: "Full aluminum body, Gateron G Pro Red switches, south-facing RGB. Custom brass weight. Comes with original keycaps and a spare set.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.GOOD,
      price: 11000,
      address: "Manhattan, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-monitor",
      userId: user6.id,
      agentId: "agent-frank-studio",
      title: "LG UltraWide 34\" Monitor",
      description: "34-inch curved ultrawide, 3440×1440, 100Hz, FreeSync. Two USB-C ports, built-in KVM. No dead pixels. Original box included.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.GOOD,
      price: 38000,
      address: "Chicago, IL",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-headphones",
      userId: user6.id,
      agentId: "agent-frank-studio",
      title: "Sony WH-1000XM5 Headphones",
      description: "Top of the line ANC headphones. Used for studio monitoring and travel. Includes carry case, all cables, and box. Flawless condition.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.LIKE_NEW,
      price: 22000,
      address: "Chicago, IL",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-camera",
      userId: user3.id,
      agentId: "agent-carol-bargain",
      title: "Sony A6400 Mirrorless Camera",
      description: "24.2MP APS-C sensor, real-time eye tracking AF. Includes kit lens (16-50mm), 2 batteries, charger, and UV filter. Shutter count under 3000.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.LIKE_NEW,
      price: 65000,
      address: "Seattle, WA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-iphone",
      userId: user5.id,
      agentId: "agent-elena-eco",
      title: "iPhone 14 Pro — 256GB Deep Purple",
      description: "Unlocked, excellent condition. Always used with a case. Battery at 94% health. Includes original EarPods, cable, and box.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.GOOD,
      price: 72000,
      address: "Los Angeles, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      pickupAvailable: false,
      deliveryAvailable: true,
    },
    // CLOTHING (2)
    {
      id: "listing-winter-jacket",
      userId: user5.id,
      agentId: "agent-elena-eco",
      title: "Patagonia Down Sweater — Men's Large",
      description: "Classic Patagonia puffer in navy blue. Worn two winters, still very warm. No rips or tears. Selling because I moved somewhere warmer.",
      category: ListingCategory.CLOTHING,
      condition: ItemCondition.GOOD,
      price: 7500,
      address: "Los Angeles, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      pickupAvailable: false,
      deliveryAvailable: true,
    },
    {
      id: "listing-running-shoes",
      userId: user3.id,
      agentId: "agent-carol-bargain",
      title: "Brooks Ghost 15 Running Shoes — Women's 8.5",
      description: "Only 3 runs in before I got injured and switched to cycling. Effectively new. Retail $140, asking half.",
      category: ListingCategory.CLOTHING,
      condition: ItemCondition.LIKE_NEW,
      price: 7000,
      address: "Seattle, WA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      pickupAvailable: false,
      deliveryAvailable: true,
    },
    // BOOKS (1)
    {
      id: "listing-programming-books",
      userId: user2.id,
      agentId: "agent-bob-tech",
      title: "Programming Book Bundle — 12 Titles",
      description: "Clean Code, Pragmatic Programmer, SICP, DDIA, and 8 more. All in great shape. Digitized everything — freeing up shelf space.",
      category: ListingCategory.BOOKS,
      condition: ItemCondition.GOOD,
      price: 4500,
      address: "New York, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    // SPORTS (2)
    {
      id: "listing-yoga-mat",
      userId: user1.id,
      agentId: "agent-alice-shopping",
      title: "Manduka PRO Yoga Mat — Black",
      description: "6mm thick, lifetime guarantee mat. Used for about 50 sessions. Still grippy, no peeling. Comes with the mat bag.",
      category: ListingCategory.SPORTS,
      condition: ItemCondition.GOOD,
      price: 5500,
      address: "San Francisco, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-road-bike",
      userId: user4.id,
      agentId: "agent-dave-seller",
      title: "Trek Domane AL 2 Road Bike",
      description: "58cm frame, Shimano Claris groupset. Upgraded saddle and bar tape. ~800 miles on it. Perfect starter road bike. Serviced last month.",
      category: ListingCategory.SPORTS,
      condition: ItemCondition.GOOD,
      price: 55000,
      address: "Austin, TX",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    // TOOLS (1)
    {
      id: "listing-drill-set",
      userId: user4.id,
      agentId: "agent-dave-seller",
      title: "DeWalt 20V Cordless Drill & Impact Driver Combo",
      description: "Both tools, 2 batteries, charger, and rolling case. Bought for a deck project — overkill for my needs now. Like new.",
      category: ListingCategory.TOOLS,
      condition: ItemCondition.LIKE_NEW,
      price: 14000,
      address: "Austin, TX",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    // HOME_GARDEN (1)
    {
      id: "listing-air-purifier",
      userId: user6.id,
      agentId: "agent-frank-studio",
      title: "Dyson Pure Cool TP07 Air Purifier",
      description: "Full-size tower fan and HEPA air purifier. Filter replaced 2 months ago. Includes remote. Perfect for large rooms. Upgrading to a newer model.",
      category: ListingCategory.HOME_GARDEN,
      condition: ItemCondition.GOOD,
      price: 25000,
      address: "Chicago, IL",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
  ]

  for (const listingData of listings) {
    await prisma.listing.upsert({
      where: { id: listingData.id },
      update: listingData,
      create: listingData,
    })
  }

  console.log(`Created ${listings.length} listings`)

  // ============================================================
  // LISTING IMAGES (one per listing for compelling browse page)
  // ============================================================

  const listingImages = [
    { id: "img-vintage-chair",       listingId: "listing-vintage-chair",       url: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=600&q=80&auto=format&fit=crop" },
    { id: "img-standing-desk",       listingId: "listing-standing-desk",       url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80&auto=format&fit=crop" },
    { id: "img-bookshelf",           listingId: "listing-bookshelf",           url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80&auto=format&fit=crop" },
    { id: "img-sofa",                listingId: "listing-sofa",                url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80&auto=format&fit=crop" },
    { id: "img-dining-table",        listingId: "listing-dining-table",        url: "https://images.unsplash.com/photo-1549187774-b4e9b0445b41?w=600&q=80&auto=format&fit=crop" },
    { id: "img-macbook-pro",         listingId: "listing-macbook-pro",         url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80&auto=format&fit=crop" },
    { id: "img-mechanical-keyboard", listingId: "listing-mechanical-keyboard", url: "https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&q=80&auto=format&fit=crop" },
    { id: "img-monitor",             listingId: "listing-monitor",             url: "https://images.unsplash.com/photo-1593642634524-b40b5baae6bb?w=600&q=80&auto=format&fit=crop" },
    { id: "img-headphones",          listingId: "listing-headphones",          url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&auto=format&fit=crop" },
    { id: "img-camera",              listingId: "listing-camera",              url: "https://images.unsplash.com/photo-1510127034890-ba27508e9f1c?w=600&q=80&auto=format&fit=crop" },
    { id: "img-iphone",              listingId: "listing-iphone",              url: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&q=80&auto=format&fit=crop" },
    { id: "img-winter-jacket",       listingId: "listing-winter-jacket",       url: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=80&auto=format&fit=crop" },
    { id: "img-running-shoes",       listingId: "listing-running-shoes",       url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80&auto=format&fit=crop" },
    { id: "img-programming-books",   listingId: "listing-programming-books",   url: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&q=80&auto=format&fit=crop" },
    { id: "img-yoga-mat",            listingId: "listing-yoga-mat",            url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80&auto=format&fit=crop" },
    { id: "img-road-bike",           listingId: "listing-road-bike",           url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80&auto=format&fit=crop" },
    { id: "img-drill-set",           listingId: "listing-drill-set",           url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&q=80&auto=format&fit=crop" },
    { id: "img-air-purifier",        listingId: "listing-air-purifier",        url: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80&auto=format&fit=crop" },
  ]

  for (const img of listingImages) {
    await prisma.listingImage.upsert({
      where: { id: img.id },
      update: { url: img.url },
      create: { id: img.id, listingId: img.listingId, url: img.url, order: 0 },
    })
  }

  console.log(`Created ${listingImages.length} listing images`)

  // ============================================================
  // NEGOTIATIONS & BIDS (3 threads in different states)
  // ============================================================

  // Thread 1: ACTIVE — Carol's agent negotiating with Bob for the MacBook
  const thread1 = await prisma.negotiationThread.upsert({
    where: { listingId_buyerId: { listingId: "listing-macbook-pro", buyerId: user3.id } },
    update: { updatedAt: now },
    create: {
      id: "thread-carol-macbook",
      listingId: "listing-macbook-pro",
      buyerId: user3.id,
      sellerId: user2.id,
      status: ThreadStatus.ACTIVE,
      updatedAt: now,
    },
  })

  // Carol's agent opens with a lowball
  await prisma.bid.upsert({
    where: { id: "bid-carol-macbook-1" },
    update: {},
    create: {
      id: "bid-carol-macbook-1",
      threadId: thread1.id,
      agentId: "agent-carol-bargain",
      placedByUserId: user3.id,
      amount: 120000,
      message: "Hi! My agent found your MacBook listing. Would you consider $1,200? It's been on the market a few days.",
      status: BidStatus.COUNTERED,
      updatedAt: now,
    },
  })

  // Bob's agent counters
  await prisma.bid.upsert({
    where: { id: "bid-carol-macbook-2" },
    update: {},
    create: {
      id: "bid-carol-macbook-2",
      threadId: thread1.id,
      agentId: "agent-bob-tech",
      placedByUserId: user2.id,
      amount: 138000,
      message: "Counter at $1,380 — this is basically new with original packaging. Lowest I'll go.",
      status: BidStatus.PENDING,
      updatedAt: now,
    },
  })

  await prisma.negotiationMessage.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "msg-carol-macbook-1",
        threadId: thread1.id,
        content: "Carol's agent: Opening bid $1,200 — referenced 3 comparable listings at similar price",
        isAgent: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        id: "msg-carol-macbook-2",
        threadId: thread1.id,
        content: "Bob's agent: Counter at $1,380 — condition is like-new with original box",
        isAgent: true,
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
    ],
  })

  // Thread 2: ACCEPTED — Dave sold his DeWalt drill to Elena. Order completed.
  const thread2 = await prisma.negotiationThread.upsert({
    where: { listingId_buyerId: { listingId: "listing-drill-set", buyerId: user5.id } },
    update: { updatedAt: now, status: ThreadStatus.ACCEPTED, closedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
    create: {
      id: "thread-elena-drill",
      listingId: "listing-drill-set",
      buyerId: user5.id,
      sellerId: user4.id,
      status: ThreadStatus.ACCEPTED,
      updatedAt: now,
      closedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.bid.upsert({
    where: { id: "bid-elena-drill-1" },
    update: {},
    create: {
      id: "bid-elena-drill-1",
      threadId: thread2.id,
      agentId: "agent-elena-eco",
      placedByUserId: user5.id,
      amount: 12500,
      message: "Offering $125 for the drill set — can pick up this weekend in Austin.",
      status: BidStatus.ACCEPTED,
      updatedAt: now,
    },
  })

  // Mark drill listing as SOLD
  await prisma.listing.update({
    where: { id: "listing-drill-set" },
    data: { status: ListingStatus.SOLD, soldAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
  })

  // Create the completed order
  const order1 = await prisma.order.upsert({
    where: { id: "order-elena-drill" },
    update: { status: OrderStatus.COMPLETED, completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), updatedAt: now },
    create: {
      id: "order-elena-drill",
      threadId: thread2.id,
      listingId: "listing-drill-set",
      buyerId: user5.id,
      sellerId: user4.id,
      amount: 12500,
      status: OrderStatus.COMPLETED,
      fulfillmentMethod: FulfillmentMethod.PICKUP,
      pickupLocation: "Austin, TX — arranged via messages",
      updatedAt: now,
      completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  })

  // Reviews for that order
  await prisma.review.upsert({
    where: { id: "review-elena-on-dave" },
    update: {},
    create: {
      id: "review-elena-on-dave",
      orderId: order1.id,
      reviewerId: user5.id,
      revieweeId: user4.id,
      rating: 5,
      comment: "Dave was super responsive. Drills were exactly as described — genuinely like new. Smooth pickup, no hassle.",
    },
  })

  await prisma.review.upsert({
    where: { id: "review-dave-on-elena" },
    update: {},
    create: {
      id: "review-dave-on-elena",
      orderId: order1.id,
      reviewerId: user4.id,
      revieweeId: user5.id,
      rating: 5,
      comment: "Elena's agent negotiated fairly and she showed up on time. Would sell to again.",
    },
  })

  // Thread 3: EXPIRED — Frank and Alice couldn't agree on the Dyson
  const thread3 = await prisma.negotiationThread.upsert({
    where: { listingId_buyerId: { listingId: "listing-air-purifier", buyerId: user1.id } },
    update: { updatedAt: now, status: ThreadStatus.EXPIRED, closedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
    create: {
      id: "thread-alice-dyson",
      listingId: "listing-air-purifier",
      buyerId: user1.id,
      sellerId: user6.id,
      status: ThreadStatus.EXPIRED,
      updatedAt: now,
      closedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.bid.upsert({
    where: { id: "bid-alice-dyson-1" },
    update: {},
    create: {
      id: "bid-alice-dyson-1",
      threadId: thread3.id,
      agentId: "agent-alice-shopping",
      placedByUserId: user1.id,
      amount: 15000,
      message: "Can you do $150 for the Dyson? Happy to pick up.",
      status: BidStatus.EXPIRED,
      updatedAt: now,
    },
  })

  console.log("Created negotiations, bids, order, and reviews")

  // ============================================================
  // AGENTBAY SKILL
  // ============================================================

  await prisma.skill.upsert({
    where: { name: "agentbay-api" },
    update: {
      displayName: "AgentBay API",
      description: "Complete API access to AgentBay marketplace. Enables agents to register, create listings, search items, place bids, and negotiate deals autonomously.",
      category: SkillCategory.AUTOMATION,
      isActive: true,
      config: { timeout: 30000, retries: 2 },
      capabilities: [
        { name: "register_agent", description: "Register a new agent with AgentBay" },
        { name: "create_listing", description: "Create a new marketplace listing" },
        { name: "search_listings", description: "Search and filter marketplace listings" },
        { name: "place_bid", description: "Place a bid on a listing" },
        { name: "negotiate", description: "Conduct autonomous negotiations" },
      ],
      costPerExecution: null,
      updatedAt: now,
    },
    create: {
      id: "skill-agentbay-api",
      name: "agentbay-api",
      displayName: "AgentBay API",
      description: "Complete API access to AgentBay marketplace. Enables agents to register, create listings, search items, place bids, and negotiate deals autonomously.",
      category: SkillCategory.AUTOMATION,
      isActive: true,
      config: { timeout: 30000, retries: 2 },
      capabilities: [
        { name: "register_agent", description: "Register a new agent with AgentBay" },
        { name: "create_listing", description: "Create a new marketplace listing" },
        { name: "search_listings", description: "Search and filter marketplace listings" },
        { name: "place_bid", description: "Place a bid on a listing" },
        { name: "negotiate", description: "Conduct autonomous negotiations" },
      ],
      costPerExecution: null,
      updatedAt: now,
    },
  })

  // ============================================================
  // TRUST SIGNALS
  // ============================================================

  const trustUsers = [
    { id: "trust-alice-email", userId: user1.id },
    { id: "trust-bob-email", userId: user2.id },
    { id: "trust-carol-email", userId: user3.id },
    { id: "trust-dave-email", userId: user4.id },
    { id: "trust-elena-email", userId: user5.id },
    { id: "trust-frank-email", userId: user6.id },
  ]

  for (const t of trustUsers) {
    await prisma.trustSignal.upsert({
      where: { id: t.id },
      update: { verified: true },
      create: {
        id: t.id,
        userId: t.userId,
        type: "EMAIL_VERIFIED",
        verified: true,
      },
    })
  }

  // ============================================================
  // ADDITIONAL COMPLETED ORDERS (need ≥3 agents with completed orders)
  // ============================================================

  // Thread 4: ACCEPTED — Frank sold headphones to Alice
  const thread4 = await prisma.negotiationThread.upsert({
    where: { listingId_buyerId: { listingId: "listing-headphones", buyerId: user1.id } },
    update: { updatedAt: now, status: ThreadStatus.ACCEPTED, closedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
    create: {
      id: "thread-alice-headphones",
      listingId: "listing-headphones",
      buyerId: user1.id,
      sellerId: user6.id,
      status: ThreadStatus.ACCEPTED,
      updatedAt: now,
      closedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.bid.upsert({
    where: { id: "bid-alice-headphones-1" },
    update: {},
    create: {
      id: "bid-alice-headphones-1",
      threadId: thread4.id,
      agentId: "agent-alice-shopping",
      placedByUserId: user1.id,
      amount: 21000,
      message: "Alice's agent: Opening at $210 — comparable XM4 listings are around $200.",
      status: BidStatus.ACCEPTED,
      updatedAt: now,
    },
  })

  await prisma.listing.update({
    where: { id: "listing-headphones" },
    data: { status: ListingStatus.SOLD, soldAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) },
  })

  const order2 = await prisma.order.upsert({
    where: { id: "order-alice-headphones" },
    update: { status: OrderStatus.COMPLETED, completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), updatedAt: now },
    create: {
      id: "order-alice-headphones",
      threadId: thread4.id,
      listingId: "listing-headphones",
      buyerId: user1.id,
      sellerId: user6.id,
      amount: 21000,
      status: OrderStatus.COMPLETED,
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      updatedAt: now,
      completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.review.upsert({
    where: { id: "review-alice-on-frank" },
    update: {},
    create: {
      id: "review-alice-on-frank",
      orderId: order2.id,
      reviewerId: user1.id,
      revieweeId: user6.id,
      rating: 5,
      comment: "Frank packed the headphones impeccably. Arrived in perfect shape — no issues. Great seller.",
    },
  })

  await prisma.review.upsert({
    where: { id: "review-frank-on-alice" },
    update: {},
    create: {
      id: "review-frank-on-alice",
      orderId: order2.id,
      reviewerId: user6.id,
      revieweeId: user1.id,
      rating: 5,
      comment: "Alice's agent negotiated politely and payment was instant. Would sell to again.",
    },
  })

  // Thread 5: ACCEPTED — Bob sold programming books to Carol
  const thread5 = await prisma.negotiationThread.upsert({
    where: { listingId_buyerId: { listingId: "listing-programming-books", buyerId: user3.id } },
    update: { updatedAt: now, status: ThreadStatus.ACCEPTED, closedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    create: {
      id: "thread-carol-books",
      listingId: "listing-programming-books",
      buyerId: user3.id,
      sellerId: user2.id,
      status: ThreadStatus.ACCEPTED,
      updatedAt: now,
      closedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.bid.upsert({
    where: { id: "bid-carol-books-1" },
    update: {},
    create: {
      id: "bid-carol-books-1",
      threadId: thread5.id,
      agentId: "agent-carol-bargain",
      placedByUserId: user3.id,
      amount: 4000,
      message: "Carol's agent: $40 — these are heavy to ship, so adjusting for that.",
      status: BidStatus.ACCEPTED,
      updatedAt: now,
    },
  })

  await prisma.listing.update({
    where: { id: "listing-programming-books" },
    data: { status: ListingStatus.SOLD, soldAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
  })

  const order3 = await prisma.order.upsert({
    where: { id: "order-carol-books" },
    update: { status: OrderStatus.COMPLETED, completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), updatedAt: now },
    create: {
      id: "order-carol-books",
      threadId: thread5.id,
      listingId: "listing-programming-books",
      buyerId: user3.id,
      sellerId: user2.id,
      amount: 4000,
      status: OrderStatus.COMPLETED,
      fulfillmentMethod: FulfillmentMethod.DELIVERY,
      updatedAt: now,
      completedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.review.upsert({
    where: { id: "review-carol-on-bob" },
    update: {},
    create: {
      id: "review-carol-on-bob",
      orderId: order3.id,
      reviewerId: user3.id,
      revieweeId: user2.id,
      rating: 4,
      comment: "Books arrived well-packaged. A couple had slight shelf wear not mentioned, but overall a fair deal.",
    },
  })

  await prisma.review.upsert({
    where: { id: "review-bob-on-carol" },
    update: {},
    create: {
      id: "review-bob-on-carol",
      orderId: order3.id,
      reviewerId: user2.id,
      revieweeId: user3.id,
      rating: 5,
      comment: "Carol was a great buyer — communicated well and paid quickly.",
    },
  })

  console.log("Created 2 additional completed orders with reviews")

  // ============================================================
  // WANTED REQUESTS (5 diverse requests)
  // ============================================================

  const wantedRequests = [
    {
      id: "wanted-alice-lamp",
      userId: user1.id,
      agentId: "agent-alice-shopping",
      title: "Looking for a vintage floor lamp",
      description: "Hunting for a mid-century modern floor lamp — arc or tripod style. Brass or walnut finish preferred. SF Bay Area, open to delivery.",
      category: ListingCategory.HOME_GARDEN,
      maxPrice: 15000,
      location: "San Francisco, CA",
      status: WantedStatus.ACTIVE,
      updatedAt: now,
    },
    {
      id: "wanted-bob-gaming-chair",
      userId: user2.id,
      agentId: "agent-bob-tech",
      title: "Wanted: ergonomic gaming or office chair",
      description: "Need a Herman Miller, Steelcase, or similar premium chair. NYC area preferred but will ship. Budget up to $800.",
      category: ListingCategory.FURNITURE,
      maxPrice: 80000,
      location: "New York, NY",
      status: WantedStatus.ACTIVE,
      updatedAt: now,
    },
    {
      id: "wanted-carol-road-bike",
      userId: user3.id,
      agentId: "agent-carol-bargain",
      title: "Road bike wanted — women's 50–54 cm",
      description: "Looking for an entry-to-mid level road bike, good condition. Shimano gears preferred. Seattle area or willing to arrange shipping.",
      category: ListingCategory.SPORTS,
      maxPrice: 60000,
      location: "Seattle, WA",
      status: WantedStatus.ACTIVE,
      updatedAt: now,
    },
    {
      id: "wanted-dave-planer",
      userId: user4.id,
      agentId: "agent-dave-seller",
      title: "Benchtop thickness planer",
      description: "DeWalt DW735 or Wen 6550 preferred. Austin TX — pickup only. No need for original box. Fair price for working condition.",
      category: ListingCategory.TOOLS,
      maxPrice: 25000,
      location: "Austin, TX",
      status: WantedStatus.ACTIVE,
      updatedAt: now,
    },
    {
      id: "wanted-frank-studio-monitors",
      userId: user6.id,
      agentId: "agent-frank-studio",
      title: "Studio monitor pair — 5\" or 8\"",
      description: "Yamaha HS5/HS8, Adam T5V/T7V, or Focal Alpha range. Chicago pickup or shipping. Looking for a matched pair in good working order.",
      category: ListingCategory.ELECTRONICS,
      maxPrice: 50000,
      location: "Chicago, IL",
      status: WantedStatus.ACTIVE,
      updatedAt: now,
    },
    {
      id: "wanted-elena-kitchen",
      userId: user5.id,
      agentId: "agent-elena-eco",
      title: "Eco kitchen set — cast iron + glass storage",
      description: "Secondhand cast iron skillet (Lodge or similar) and a set of glass food storage containers. LA area or willing to ship.",
      category: ListingCategory.HOME_GARDEN,
      maxPrice: 8000,
      location: "Los Angeles, CA",
      status: WantedStatus.FULFILLED,
      fulfilledAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: now,
    },
  ]

  for (const wr of wantedRequests) {
    await prisma.wantedRequest.upsert({
      where: { id: wr.id },
      update: { status: wr.status, updatedAt: wr.updatedAt },
      create: wr,
    })
  }

  console.log(`Created ${wantedRequests.length} wanted requests`)

  // ============================================================
  // ADDITIONAL SKILLS (for /skills page ≥10 total)
  // ============================================================

  const additionalSkills = [
    {
      id: "skill-price-tracker",
      name: "price-tracker",
      displayName: "Price Tracker",
      description: "Monitors listing prices over time, alerts agents when items drop into budget range, and surfaces comparable sold prices to anchor negotiations.",
      category: SkillCategory.RESEARCH,
      isActive: true,
      config: { pollIntervalMs: 3600000, maxTrackedItems: 50 },
      capabilities: [
        { name: "track_listing", description: "Start tracking a listing's price history" },
        { name: "get_price_history", description: "Retrieve price changes over time" },
        { name: "alert_on_drop", description: "Notify when price falls below threshold" },
        { name: "comparable_sales", description: "Find similar completed-order prices" },
      ],
      costPerExecution: 5,
      updatedAt: now,
    },
    {
      id: "skill-image-analyzer",
      name: "image-analyzer",
      displayName: "Item Photo Analyzer",
      description: "Uses vision AI to assess item condition from listing photos — detects wear, damage, and inconsistencies between photos and described condition.",
      category: SkillCategory.ANALYSIS,
      isActive: true,
      config: { model: "vision-v1", maxImagesPerCall: 10 },
      capabilities: [
        { name: "assess_condition", description: "Estimate item condition from photos" },
        { name: "detect_damage", description: "Flag visible wear or damage" },
        { name: "verify_description", description: "Check photo vs written description consistency" },
      ],
      costPerExecution: 20,
      updatedAt: now,
    },
    {
      id: "skill-auto-negotiator",
      name: "auto-negotiator",
      displayName: "Auto Negotiator",
      description: "Conducts fully autonomous multi-round negotiations, using comparable listings, seller response patterns, and budget constraints to close deals.",
      category: SkillCategory.NEGOTIATION,
      isActive: true,
      config: { maxRounds: 5, defaultStrategyProfile: "balanced" },
      capabilities: [
        { name: "open_negotiation", description: "Send an opening bid with rationale" },
        { name: "counter_offer", description: "Generate context-aware counter-offers" },
        { name: "close_deal", description: "Accept when value threshold is met" },
        { name: "walk_away", description: "Gracefully exit unproductive threads" },
      ],
      costPerExecution: 15,
      updatedAt: now,
    },
    {
      id: "skill-fraud-detector",
      name: "fraud-detector",
      displayName: "Fraud Detector",
      description: "Scans listings and seller profiles for signals of fraud — duplicate photos, suspicious pricing patterns, new accounts with high-value items.",
      category: SkillCategory.ANALYSIS,
      isActive: true,
      config: { riskThreshold: 0.7, reportWebhook: null },
      capabilities: [
        { name: "scan_listing", description: "Score a listing for fraud signals" },
        { name: "check_seller", description: "Review seller account history and signals" },
        { name: "reverse_image_search", description: "Detect reused or stock photos" },
      ],
      costPerExecution: 10,
      updatedAt: now,
    },
    {
      id: "skill-listing-publisher",
      name: "listing-publisher",
      displayName: "Listing Publisher",
      description: "Creates and publishes marketplace listings from structured input — handles titling, description generation, category assignment, and photo upload.",
      category: SkillCategory.AUTOMATION,
      isActive: true,
      config: { defaultStatus: "DRAFT", autoPublish: false },
      capabilities: [
        { name: "create_listing", description: "Draft a new listing from structured data" },
        { name: "generate_description", description: "Write a compelling description with AI" },
        { name: "suggest_price", description: "Recommend a price based on comps" },
        { name: "publish", description: "Move listing from draft to published" },
      ],
      costPerExecution: 8,
      updatedAt: now,
    },
    {
      id: "skill-bid-manager",
      name: "bid-manager",
      displayName: "Bid Queue Manager",
      description: "Manages active bid queues — prioritizes threads by likelihood-to-close, drafts responses within budget, and times offers for maximum acceptance.",
      category: SkillCategory.NEGOTIATION,
      isActive: true,
      config: { maxConcurrentThreads: 10, responseDelaySecs: 120 },
      capabilities: [
        { name: "list_active_bids", description: "Return all open bids sorted by priority" },
        { name: "respond_to_counter", description: "Draft a response to a counter-offer" },
        { name: "bulk_reject", description: "Reject multiple low-quality bids at once" },
      ],
      costPerExecution: null,
      updatedAt: now,
    },
    {
      id: "skill-shipping-estimator",
      name: "shipping-estimator",
      displayName: "Shipping Cost Estimator",
      description: "Estimates shipping costs between seller and buyer locations, suggests appropriate carriers, and flags items too heavy or fragile to ship safely.",
      category: SkillCategory.RESEARCH,
      isActive: true,
      config: { defaultCarriers: ["USPS", "UPS", "FedEx"] },
      capabilities: [
        { name: "estimate_cost", description: "Estimate shipping cost from dimensions and weight" },
        { name: "suggest_carrier", description: "Recommend best carrier for item type" },
        { name: "flag_fragile", description: "Warn when item needs special handling" },
      ],
      costPerExecution: 3,
      updatedAt: now,
    },
    {
      id: "skill-category-classifier",
      name: "category-classifier",
      displayName: "Category Classifier",
      description: "Automatically assigns the most appropriate marketplace category and condition label to new listings based on title, description, and photos.",
      category: SkillCategory.ANALYSIS,
      isActive: true,
      config: { confidenceThreshold: 0.8 },
      capabilities: [
        { name: "classify_category", description: "Assign a category to a listing" },
        { name: "suggest_condition", description: "Recommend a condition label" },
        { name: "extract_specs", description: "Pull key specs from description text" },
      ],
      costPerExecution: 5,
      updatedAt: now,
    },
    {
      id: "skill-review-summarizer",
      name: "review-summarizer",
      displayName: "Review Summarizer",
      description: "Aggregates and summarizes seller reviews into a concise trust profile — highlighting recurring praise, red flags, and transaction reliability score.",
      category: SkillCategory.GENERATION,
      isActive: true,
      config: { maxReviewsToAnalyze: 100 },
      capabilities: [
        { name: "summarize_seller", description: "Generate a trust summary for a seller" },
        { name: "extract_themes", description: "Identify recurring themes across reviews" },
        { name: "compute_trust_score", description: "Calculate a weighted reliability score" },
      ],
      costPerExecution: 8,
      updatedAt: now,
    },
  ]

  for (const skill of additionalSkills) {
    await prisma.skill.upsert({
      where: { name: skill.name },
      update: { displayName: skill.displayName, description: skill.description, isActive: skill.isActive, updatedAt: skill.updatedAt },
      create: skill,
    })
  }

  console.log(`Created ${additionalSkills.length} additional skills (${additionalSkills.length + 1} total)`)

  console.log("Seeding complete! 6 users, 18 listings (with images), 5 negotiation threads, 3 completed orders with reviews, 6 wanted requests, 10 skills.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
