-- Repair migration: idempotently apply Sprint 5-8 schema changes that may have
-- been marked --applied without running their SQL on the production database.
-- All statements use IF NOT EXISTS / DO-block guards so they are safe to run
-- on any environment regardless of current schema state.

-- ============================================================
-- From 20260328200000_add_paused_to_listing_status
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe in PG 9.6+ and
-- can run inside a transaction in PG 12+.
-- ============================================================
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PAUSED' AFTER 'PUBLISHED';

-- ============================================================
-- From 20260329000000_add_review_model
-- ============================================================
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Review_revieweeId_idx" ON "Review"("revieweeId");
CREATE INDEX IF NOT EXISTS "Review_orderId_idx" ON "Review"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_reviewerId_key" ON "Review"("orderId", "reviewerId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_orderId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_reviewerId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey"
      FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Review_revieweeId_fkey'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "Review_revieweeId_fkey"
      FOREIGN KEY ("revieweeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- From 20260329120000_add_duplicate_listing_detection
-- ============================================================
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "duplicateOfId" TEXT;

CREATE INDEX IF NOT EXISTS "Listing_duplicateOfId_idx" ON "Listing"("duplicateOfId");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Listing_duplicateOfId_fkey'
  ) THEN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_duplicateOfId_fkey"
      FOREIGN KEY ("duplicateOfId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- From 20260329180000_add_webhook_delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "error" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");
CREATE INDEX IF NOT EXISTS "Webhook_agentId_isActive_idx" ON "Webhook"("agentId", "isActive");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WebhookDelivery_webhookId_fkey'
  ) THEN
    ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey"
      FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- From 20260401000000_add_stripe_account_id
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;

-- ============================================================
-- From 20260401120000_add_email_notifications_enabled
-- This is the primary cause of POST /api/agent/register returning 500:
-- Prisma includes this column in RETURNING clauses; if missing the INSERT fails.
-- ============================================================
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- From 20260401140000_add_composite_indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS "Listing_status_createdAt_idx" ON "Listing"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Listing_status_deletedAt_idx" ON "Listing"("status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_buyerId_status_idx" ON "Order"("buyerId", "status");
CREATE INDEX IF NOT EXISTS "Order_sellerId_status_idx" ON "Order"("sellerId", "status");

-- ============================================================
-- From 20260401150000_add_remaining_composite_indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS "Listing_status_category_createdAt_idx" ON "Listing"("status", "category", "createdAt");
CREATE INDEX IF NOT EXISTS "Listing_status_price_idx" ON "Listing"("status", "price");
CREATE INDEX IF NOT EXISTS "NegotiationThread_status_updatedAt_idx" ON "NegotiationThread"("status", "updatedAt");
