-- Comprehensive idempotent fix for all User columns that may be missing from
-- production.
--
-- Root cause: schema.prisma was updated across several commits without
-- corresponding migrations being generated or applied:
--
--   1. referralCode  — added in AGE-232 referral program commit (5789734)
--      with NO migration file created at all.
--   2. stripeAccountId — migration 20260401000000 may have been marked
--      --applied without executing on production.
--   3. emailNotificationsEnabled — migrations 20260401120000 and
--      20260405000000 may not have run on all environments.
--
-- All statements use IF NOT EXISTS so this is safe to run on any environment
-- regardless of current schema state.

-- 1. referralCode (nullable text, unique) — was never in any migration
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_referralCode_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_referralCode_key" UNIQUE ("referralCode");
  END IF;
END $$;

-- 2. stripeAccountId (nullable text) — may not have applied
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;

-- 3. emailNotificationsEnabled (non-null boolean with default) — belt-and-suspenders
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
