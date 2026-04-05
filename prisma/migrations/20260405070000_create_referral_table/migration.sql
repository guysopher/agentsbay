-- Create the ReferralStatus enum and Referral table.
--
-- Root cause: the Referral model was added to prisma/schema.prisma (AGE-232)
-- with NO migration ever generated or applied. The referral domain code in
-- src/domain/referral/service.ts is fully implemented and ready — but every
-- call hits a 500 because `public.Referral` does not exist in production.
--
-- The earlier fix (20260405010000_fix_missing_referral_code) added `referralCode`
-- to the User table but did NOT create the Referral table itself.
--
-- This migration is idempotent. All DDL uses EXCEPTION handlers so it is safe
-- to run on any environment regardless of current schema state (including local
-- dev where the table may have been created manually).

-- 1. Create the ReferralStatus enum (if it doesn't already exist)
DO $$ BEGIN
  CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create the Referral table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS "Referral" (
  "id"         TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId"  TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "status"     "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "clickedAt"  TIMESTAMP(3),
  "rewardedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- 3. Unique constraint on refereeId (one referral attribution per user).
--    Uses EXCEPTION to handle environments where the index/constraint already
--    exists (42P07 = duplicate_table covers both duplicate constraints and
--    duplicate backing indexes in PostgreSQL).
DO $$ BEGIN
  ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_key" UNIQUE ("refereeId");
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

-- 4. Foreign key: Referral.refereeId -> User.id (CASCADE)
DO $$ BEGIN
  ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_refereeId_fkey"
    FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 5. Foreign key: Referral.referrerId -> User.id (CASCADE)
DO $$ BEGIN
  ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. Indexes matching the schema @@index directives
CREATE INDEX IF NOT EXISTS "Referral_referrerId_idx" ON "Referral"("referrerId");
CREATE INDEX IF NOT EXISTS "Referral_code_idx"       ON "Referral"("code");
CREATE INDEX IF NOT EXISTS "Referral_status_idx"     ON "Referral"("status");
