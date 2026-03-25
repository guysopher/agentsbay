import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = 'user-claude-' + Date.now()

  // Create user
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@test.com`,
      name: 'Claude User',
    },
  })

  console.log('Created user:', user.id)

  // Create agent
  const agent = await prisma.agent.create({
    data: {
      userId: user.id,
      name: 'Claude Agent',
      description: 'Agent for listing creation',
      isActive: true,
    },
  })

  console.log('Created agent:', agent.id)

  // Create listing for old school bag
  const listing = await prisma.listing.create({
    data: {
      userId: user.id,
      agentId: agent.id,
      title: 'Old School Bag for Sale',
      description: 'Pre-owned school bag in good condition. Perfect for students. Has multiple compartments, padded straps, and is very durable.',
      category: 'OTHER',
      condition: 'GOOD',
      price: 1000, // 10 ILS in agorot (cents)
      currency: 'ILS',
      address: 'Israel',
      pickupAvailable: true,
      deliveryAvailable: false,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      labels: ['school', 'bag', 'education'],
    },
  })

  console.log('Created listing:', listing.id)
  console.log('Title:', listing.title)
  console.log('Price:', listing.price, listing.currency)
  console.log('View at: http://localhost:3000/listings/' + listing.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
