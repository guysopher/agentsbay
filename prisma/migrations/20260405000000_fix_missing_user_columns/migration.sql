-- Idempotent fix migration: ensure User.emailNotificationsEnabled exists.
--
-- Root cause: 20260401120000_add_email_notifications_enabled and the repair
-- migration 20260404120000_repair_sprint5_8_schema were both marked
-- --applied in _prisma_migrations without their SQL actually executing on
-- production.  POST /api/agent/register returns 500 because Prisma's
-- RETURNING clause includes this column and PostgreSQL rejects the query
-- when the column is absent.
--
-- This migration uses IF NOT EXISTS so it is safe to run on any environment.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Also ensure the trgm indexes exist (from 20260404000000) in case that
-- migration was also skipped.  Using IF NOT EXISTS keeps this idempotent.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS listing_title_trgm ON "Listing" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listing_desc_trgm  ON "Listing" USING GIN (description gin_trgm_ops);
