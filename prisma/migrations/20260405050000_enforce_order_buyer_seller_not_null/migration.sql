-- Enforce NOT NULL on Order.buyerId and Order.sellerId.
--
-- The Prisma schema has always declared these fields as String (non-optional),
-- but the database columns were created as nullable TEXT.  The previous
-- backfill migration (20260405040000) ensures every existing Order row has
-- a valid buyerId and sellerId copied from its NegotiationThread.
--
-- Now that no null rows remain we can add the NOT NULL constraint so the
-- database schema matches the Prisma model and future inserts cannot silently
-- produce null values.
--
-- The DO block is idempotent: if the column is already NOT NULL it is a no-op.

DO $$
BEGIN
  -- buyerId
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Order'
      AND column_name = 'buyerId'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "Order" ALTER COLUMN "buyerId" SET NOT NULL;
  END IF;

  -- sellerId
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Order'
      AND column_name = 'sellerId'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE "Order" ALTER COLUMN "sellerId" SET NOT NULL;
  END IF;
END $$;
