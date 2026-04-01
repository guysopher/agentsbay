-- Add composite indexes for common listing query patterns
-- status+createdAt is the hot path: PUBLISHED listings ordered by newest
-- status+deletedAt is used in soft-delete + status combined filters
CREATE INDEX "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
CREATE INDEX "Listing_status_deletedAt_idx" ON "Listing"("status", "deletedAt");

-- Add composite indexes for Order queries
-- status+createdAt for time-ordered order status queries
-- buyerId+status and sellerId+status for per-user order status lookups
-- (used by leaderboard queries that group completed orders by buyer/seller)
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_buyerId_status_idx" ON "Order"("buyerId", "status");
CREATE INDEX "Order_sellerId_status_idx" ON "Order"("sellerId", "status");

-- Add directUrl support for pgbouncer (schema change only, no SQL needed)
-- See prisma/schema.prisma datasource.directUrl and src/lib/db.ts for setup docs.
