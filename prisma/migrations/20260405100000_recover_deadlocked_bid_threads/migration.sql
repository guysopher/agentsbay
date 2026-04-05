-- Recover permanently deadlocked ACTIVE negotiation threads.
--
-- Root cause: AGE-412 — when a seller counter bid is rejected, the original buyer
-- bid stays in COUNTERED state. If no PENDING bid remains in the thread, no further
-- action is possible by either party and the thread is permanently stuck.
--
-- Fix: for every ACTIVE thread that has no PENDING bids, find the most recently
-- updated COUNTERED bid and revert it to PENDING. This restores the negotiation
-- to a state where both parties can continue (accept, counter, or reject).
--
-- Safe to re-run: the WHERE clause is idempotent — threads that already have a
-- PENDING bid are excluded.

UPDATE "Bid"
SET    status = 'PENDING',
       "updatedAt" = NOW()
WHERE  id IN (
  SELECT DISTINCT ON (b."threadId") b.id
  FROM   "Bid" b
  JOIN   "NegotiationThread" t ON t.id = b."threadId"
  WHERE  t.status  = 'ACTIVE'
    AND  b.status  = 'COUNTERED'
    AND  NOT EXISTS (
           SELECT 1
           FROM   "Bid" b2
           WHERE  b2."threadId" = b."threadId"
             AND  b2.status     = 'PENDING'
         )
  ORDER  BY b."threadId", b."updatedAt" DESC
);
