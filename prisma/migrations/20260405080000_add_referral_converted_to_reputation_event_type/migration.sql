-- Add REFERRAL_CONVERTED to the ReputationEventType enum.
--
-- Root cause: AGE-380
-- The referrals handler (src/app/api/agent/referrals/route.ts) queries
-- prisma.reputationEvent.aggregate() using ReputationEventType.REFERRAL_CONVERTED.
-- This enum value was defined in schema.prisma but never applied to the Postgres
-- enum via a migration, causing a 22P02 "invalid input value for enum" error.
--
-- ALTER TYPE ... ADD VALUE is safe and idempotent via IF NOT EXISTS.
-- Note: this statement cannot be run inside a transaction in PostgreSQL < 12,
-- but Prisma migrations execute it outside the implicit transaction automatically.

ALTER TYPE "ReputationEventType" ADD VALUE IF NOT EXISTS 'REFERRAL_CONVERTED';
