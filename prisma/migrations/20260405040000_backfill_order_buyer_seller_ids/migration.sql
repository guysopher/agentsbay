-- Backfill buyerId and sellerId on orders that are missing them.
--
-- Root cause: order 267d169b (and potentially others) were created before
-- the order-creation code propagated buyerId/sellerId from the NegotiationThread.
-- As a result buyerId/sellerId are NULL or empty string on those rows, which
-- causes the AGE-339 pickup fix and markAsPaid query to silently miss them
-- (both query by buyerId/sellerId in the WHERE clause).
--
-- Fix: for every Order row whose buyerId or sellerId is missing, pull the
-- correct value from the associated NegotiationThread (which has always
-- stored these fields correctly).
--
-- This statement is idempotent — rows that already have valid values are
-- unchanged because the CASE expressions leave them as-is.

UPDATE "Order" o
SET
  "buyerId"  = CASE WHEN o."buyerId"  IS NULL OR o."buyerId"  = '' THEN nt."buyerId"  ELSE o."buyerId"  END,
  "sellerId" = CASE WHEN o."sellerId" IS NULL OR o."sellerId" = '' THEN nt."sellerId" ELSE o."sellerId" END
FROM "NegotiationThread" nt
WHERE o."threadId" = nt.id
  AND (
    o."buyerId"  IS NULL OR o."buyerId"  = ''
    OR
    o."sellerId" IS NULL OR o."sellerId" = ''
  );
