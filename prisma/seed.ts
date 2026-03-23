import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create test users
  const hashedPassword = await bcrypt.hash("password123", 10)

  const user1 = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: "Alice J.",
          location: "San Francisco, CA",
          bio: "Love finding great deals on furniture!",
        },
      },
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {},
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      password: hashedPassword,
      emailVerified: new Date(),
      profile: {
        create: {
          displayName: "Bob S.",
          location: "New York, NY",
          bio: "Tech enthusiast and collector",
        },
      },
    },
  })

  console.log("Created users:", { user1, user2 })

  // Create agents
  const agent1 = await prisma.agent.create({
    data: {
      userId: user1.id,
      name: "Alice's Shopping Agent",
      description: "Helps me find furniture and home goods",
      autoNegotiate: true,
      maxBidAmount: 50000, // $500
      minAcceptAmount: 5000, // $50
      maxAcceptAmount: 100000, // $1000
      requireApproval: false,
      preferredLocation: "San Francisco Bay Area",
      maxDistance: 50,
    },
  })

  const agent2 = await prisma.agent.create({
    data: {
      userId: user2.id,
      name: "Bob's Tech Agent",
      description: "Finds electronics and gadgets",
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
      userId: user1.id,
      title: "Vintage Wooden Office Chair",
      description:
        "Beautiful mid-century office chair in excellent condition. Comfortable and sturdy. Perfect for home office.",
      category: "FURNITURE",
      condition: "GOOD",
      price: 12000, // $120
      location: "San Francisco, CA",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      userId: user1.id,
      title: "Standing Desk - Adjustable Height",
      description:
        "Electric standing desk with memory presets. Great condition, barely used. 60x30 inches.",
      category: "FURNITURE",
      condition: "LIKE_NEW",
      price: 35000, // $350
      location: "Oakland, CA",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      userId: user2.id,
      title: "MacBook Pro 13-inch M1",
      description:
        "2020 MacBook Pro with M1 chip, 8GB RAM, 256GB SSD. Excellent condition with original box and charger.",
      category: "ELECTRONICS",
      condition: "LIKE_NEW",
      price: 80000, // $800
      location: "Brooklyn, NY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
    {
      userId: user2.id,
      title: "Mechanical Keyboard - Cherry MX Blue",
      description:
        "Custom mechanical keyboard with RGB lighting. Cherry MX Blue switches. Used for 6 months.",
      category: "ELECTRONICS",
      condition: "GOOD",
      price: 9000, // $90
      location: "Manhattan, NY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      userId: user1.id,
      title: "Garden Tool Set",
      description:
        "Complete set of garden tools including shovel, rake, hoe, and pruning shears. All in good working condition.",
      category: "HOME_GARDEN",
      condition: "GOOD",
      price: 4500, // $45
      location: "San Francisco, CA",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: false,
    },
    {
      userId: user2.id,
      title: "Professional Camera Tripod",
      description:
        "Sturdy aluminum tripod with ball head. Supports up to 15 lbs. Perfect for DSLR cameras.",
      category: "ELECTRONICS",
      condition: "LIKE_NEW",
      price: 6500, // $65
      location: "Queens, NY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: true,
    },
  ]

  for (const listingData of listings) {
    await prisma.listing.create({
      data: listingData,
    })
  }

  console.log("Created sample listings")

  // Create trust signals
  await prisma.trustSignal.createMany({
    data: [
      {
        userId: user1.id,
        type: "EMAIL_VERIFIED",
        verified: true,
      },
      {
        userId: user2.id,
        type: "EMAIL_VERIFIED",
        verified: true,
      },
    ],
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
