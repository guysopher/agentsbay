import { PrismaClient, ListingCategory, ItemCondition, ListingStatus, SkillCategory } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")
  const now = new Date()

  // Create test users
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {
      name: "Alice Johnson",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        upsert: {
          create: {
            id: "profile-alice",
            displayName: "Alice J.",
            location: "San Francisco, CA",
            bio: "Love finding great deals on furniture!",
            updatedAt: now,
          },
          update: {
            displayName: "Alice J.",
            location: "San Francisco, CA",
            bio: "Love finding great deals on furniture!",
            updatedAt: now,
          },
        },
      },
    },
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
          bio: "Love finding great deals on furniture!",
          updatedAt: now,
        },
      },
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {
      name: "Bob Smith",
      password: hashedPassword,
      emailVerified: now,
      updatedAt: now,
      Profile: {
        upsert: {
          create: {
            id: "profile-bob",
            displayName: "Bob S.",
            location: "New York, NY",
            bio: "Tech enthusiast and collector",
            updatedAt: now,
          },
          update: {
            displayName: "Bob S.",
            location: "New York, NY",
            bio: "Tech enthusiast and collector",
            updatedAt: now,
          },
        },
      },
    },
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
          bio: "Tech enthusiast and collector",
          updatedAt: now,
        },
      },
    },
  })

  console.log("Created users:", { user1, user2 })

  // Create agents
  const agent1 = await prisma.agent.upsert({
    where: { id: "agent-alice-shopping" },
    update: {
      userId: user1.id,
      name: "Alice's Shopping Agent",
      description: "Helps me find furniture and home goods",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 50000, // $500
      minAcceptAmount: 5000, // $50
      maxAcceptAmount: 100000, // $1000
      requireApproval: false,
      preferredLocation: "San Francisco Bay Area",
      maxDistance: 50,
    },
    create: {
      id: "agent-alice-shopping",
      userId: user1.id,
      name: "Alice's Shopping Agent",
      description: "Helps me find furniture and home goods",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 50000, // $500
      minAcceptAmount: 5000, // $50
      maxAcceptAmount: 100000, // $1000
      requireApproval: false,
      preferredLocation: "San Francisco Bay Area",
      maxDistance: 50,
    },
  })

  const agent2 = await prisma.agent.upsert({
    where: { id: "agent-bob-tech" },
    update: {
      userId: user2.id,
      name: "Bob's Tech Agent",
      description: "Finds electronics and gadgets",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 200000, // $2000
      requireApproval: true,
      preferredLocation: "New York",
    },
    create: {
      id: "agent-bob-tech",
      userId: user2.id,
      name: "Bob's Tech Agent",
      description: "Finds electronics and gadgets",
      updatedAt: now,
      autoNegotiate: true,
      maxBidAmount: 200000, // $2000
      requireApproval: true,
      preferredLocation: "New York",
    },
  })

  console.log("Created agents:", { agent1, agent2 })

  // Create sample listings
  const listings = [
    {
      id: "listing-vintage-chair",
      userId: user1.id,
      title: "Vintage Wooden Office Chair",
      description:
        "Beautiful mid-century office chair in excellent condition. Comfortable and sturdy. Perfect for home office.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.GOOD,
      price: 12000, // $120
      address: "San Francisco, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-standing-desk",
      userId: user1.id,
      title: "Standing Desk - Adjustable Height",
      description:
        "Electric standing desk with memory presets. Great condition, barely used. 60x30 inches.",
      category: ListingCategory.FURNITURE,
      condition: ItemCondition.LIKE_NEW,
      price: 35000, // $350
      address: "Oakland, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-macbook-pro",
      userId: user2.id,
      title: "MacBook Pro 13-inch M1",
      description:
        "2020 MacBook Pro with M1 chip, 8GB RAM, 256GB SSD. Excellent condition with original box and charger.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.LIKE_NEW,
      price: 80000, // $800
      address: "Brooklyn, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      id: "listing-mechanical-keyboard",
      userId: user2.id,
      title: "Mechanical Keyboard - Cherry MX Blue",
      description:
        "Custom mechanical keyboard with RGB lighting. Cherry MX Blue switches. Used for 6 months.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.GOOD,
      price: 9000, // $90
      address: "Manhattan, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-garden-tools",
      userId: user1.id,
      title: "Garden Tool Set",
      description:
        "Complete set of garden tools including shovel, rake, hoe, and pruning shears. All in good working condition.",
      category: ListingCategory.HOME_GARDEN,
      condition: ItemCondition.GOOD,
      price: 4500, // $45
      address: "San Francisco, CA",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      id: "listing-camera-tripod",
      userId: user2.id,
      title: "Professional Camera Tripod",
      description:
        "Sturdy aluminum tripod with ball head. Supports up to 15 lbs. Perfect for DSLR cameras.",
      category: ListingCategory.ELECTRONICS,
      condition: ItemCondition.LIKE_NEW,
      price: 6500, // $65
      address: "Queens, NY",
      status: ListingStatus.PUBLISHED,
      updatedAt: now,
      publishedAt: now,
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

  console.log("Created sample listings")

  // Create the AgentBay skill - the main skill agents install
  await prisma.skill.upsert({
    where: { name: "agentbay-api" },
    update: {
      displayName: "AgentBay API",
      description: "Complete API access to AgentBay marketplace. Enables agents to register, create listings, search items, place bids, and negotiate deals autonomously.",
      category: SkillCategory.AUTOMATION,
      isActive: true,
      config: {
        timeout: 30000,
        retries: 2,
      },
      capabilities: [
        {
          name: "register_agent",
          description: "Register a new agent with AgentBay",
        },
        {
          name: "create_listing",
          description: "Create a new marketplace listing",
        },
        {
          name: "search_listings",
          description: "Search and filter marketplace listings",
        },
        {
          name: "place_bid",
          description: "Place a bid on a listing",
        },
        {
          name: "negotiate",
          description: "Conduct autonomous negotiations",
        },
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
      config: {
        timeout: 30000,
        retries: 2,
      },
      capabilities: [
        {
          name: "register_agent",
          description: "Register a new agent with AgentBay",
        },
        {
          name: "create_listing",
          description: "Create a new marketplace listing",
        },
        {
          name: "search_listings",
          description: "Search and filter marketplace listings",
        },
        {
          name: "place_bid",
          description: "Place a bid on a listing",
        },
        {
          name: "negotiate",
          description: "Conduct autonomous negotiations",
        },
      ],
      costPerExecution: null,
      updatedAt: now,
    },
  })

  console.log("Created AgentBay skill")

  // Create trust signals
  await prisma.trustSignal.upsert({
    where: { id: "trust-alice-email" },
    update: {
      userId: user1.id,
      type: "EMAIL_VERIFIED",
      verified: true,
    },
    create: {
      id: "trust-alice-email",
      userId: user1.id,
      type: "EMAIL_VERIFIED",
      verified: true,
    },
  })

  await prisma.trustSignal.upsert({
    where: { id: "trust-bob-email" },
    update: {
      userId: user2.id,
      type: "EMAIL_VERIFIED",
      verified: true,
    },
    create: {
      id: "trust-bob-email",
      userId: user2.id,
      type: "EMAIL_VERIFIED",
      verified: true,
    },
  })

  console.log("Seeding complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
