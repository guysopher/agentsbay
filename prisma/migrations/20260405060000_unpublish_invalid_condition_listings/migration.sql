-- Unpublish listings that have condition = 'NEW'.
--
-- Root cause: the ItemCondition enum includes 'NEW' at the schema level, but
-- AgentsBay is a second-hand marketplace — only GOOD, LIKE_NEW, FAIR, and POOR
-- are valid conditions for resale items.  Three listings slipped through before
-- publish-time validation was added (AGE-343).
--
-- Fix: move those listings back to DRAFT so they are no longer visible to buyers.
-- Sellers can re-publish after correcting the condition field.
--
-- This is idempotent — rows already in DRAFT (or other non-PUBLISHED states) are
-- not touched because the WHERE clause restricts to status = 'PUBLISHED'.

UPDATE "Listing"
SET    "status"    = 'DRAFT',
       "publishedAt" = NULL,
       "updatedAt" = NOW()
WHERE  "condition" = 'NEW'
  AND  "status"   = 'PUBLISHED';
