import { PrismaClient } from '@prisma/client'

// Vercel serverless connection pooling setup:
//
// Set DATABASE_URL to a PgBouncer connection string with these params:
//   ?pgbouncer=true&connection_limit=1
//
// Example:
//   DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1"
//   DIRECT_URL="postgresql://user:pass@host:5432/db"
//
// - DATABASE_URL routes through PgBouncer (port 6543) and caps each serverless
//   instance to 1 connection. With ~20 Vercel instances this keeps total DB
//   connections bounded to ~20.
// - DIRECT_URL is the direct Postgres connection used by `prisma migrate deploy`
//   (pgbouncer=true disables prepared statements which breaks migrations).
// - prisma/schema.prisma uses directUrl = env("DIRECT_URL") for migrations.
// - In development both vars can point to the same local Postgres instance.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
