-- Idempotent fix: add Bid.placedByUserId column that was missing from production.
--
-- Root cause: AGE-31 (commit 812c16e) added `placedByUserId String?` to the Bid
-- model in schema.prisma for turn enforcement (buyer cannot accept/counter their own bid),
-- but no migration was generated. The column was never added to the production DB.
--
-- Prisma includes this column in INSERT and RETURNING clauses, so any
-- POST /api/agent/listings/:id/bids call fails with a 500 error.
--
-- This migration uses IF NOT EXISTS so it is safe to run on any environment.

ALTER TABLE "Bid" ADD COLUMN IF NOT EXISTS "placedByUserId" TEXT;
