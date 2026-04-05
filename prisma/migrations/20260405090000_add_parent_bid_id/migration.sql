-- Add parentBidId to Bid to track which bid a counter is responding to.
--
-- Root cause: AGE-412 — negotiation deadlock when seller rejects their own counter.
-- When a seller creates a counter bid via /counter, the original buyer bid is marked
-- COUNTERED. If the seller then rejects their own counter, the original bid stays
-- COUNTERED with no valid transitions — permanently deadlocking the thread.
--
-- The fix in rejectBid uses parentBidId to precisely identify the bid to revert to
-- PENDING (instead of the fragile "most recently COUNTERED" heuristic from AGE-409).
--
-- Uses IF NOT EXISTS so it is safe to re-run on any environment.

ALTER TABLE "Bid" ADD COLUMN IF NOT EXISTS "parentBidId" TEXT;
