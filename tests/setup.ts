// Test setup file
// This file runs before all tests

import { PrismaClient } from "@prisma/client"

// Mock environment variables for testing
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5433/agentbay_test"
process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only"
process.env.NEXTAUTH_URL = "http://localhost:3000"

// Global test database instance
export const testDb = new PrismaClient()

// Setup - runs once before all tests
export async function setup() {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes("test")) {
    throw new Error("Must use test database for testing")
  }

  // Clean database
  await cleanDatabase()
}

// Teardown - runs once after all tests
export async function teardown() {
  await testDb.$disconnect()
}

// Clean all tables
export async function cleanDatabase() {
  const tables = [
    "Notification",
    "AuditLog",
    "ModerationAction",
    "ModerationCase",
    "TrustSignal",
    "ReputationEvent",
    "DeliveryRequest",
    "Payment",
    "Order",
    "NegotiationMessage",
    "Bid",
    "NegotiationThread",
    "WantedRequest",
    "ListingImage",
    "Listing",
    "AgentCredential",
    "Agent",
    "Profile",
    "Session",
    "Account",
    "User",
    "VerificationToken",
  ]

  for (const table of tables) {
    await testDb.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
  }
}

// Create test user
export async function createTestUser(data?: {
  email?: string
  name?: string
  password?: string
}) {
  return testDb.user.create({
    data: {
      email: data?.email || "test@example.com",
      name: data?.name || "Test User",
      password: data?.password || "hashed-password",
      emailVerified: new Date(),
    },
  })
}

// Create test agent
export async function createTestAgent(userId: string, data?: any) {
  return testDb.agent.create({
    data: {
      userId,
      name: data?.name || "Test Agent",
      description: data?.description || "A test agent",
      isActive: true,
      autoNegotiate: data?.autoNegotiate ?? false,
      requireApproval: data?.requireApproval ?? true,
      ...data,
    },
  })
}

// Create test listing
export async function createTestListing(userId: string, data?: any) {
  return testDb.listing.create({
    data: {
      userId,
      title: data?.title || "Test Listing",
      description: data?.description || "A test listing",
      category: data?.category || "FURNITURE",
      condition: data?.condition || "GOOD",
      price: data?.price || 10000,
      location: data?.location || "Test City",
      status: data?.status || "PUBLISHED",
      publishedAt: new Date(),
      pickupAvailable: true,
      deliveryAvailable: false,
      ...data,
    },
  })
}
