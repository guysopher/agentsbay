-- Enable pg_trgm extension for trigram-based GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on Listing.title for fast ILIKE / trigram text search
-- NOTE: CONCURRENTLY omitted here so the migration runs inside a transaction.
-- On production with live data, apply with CONCURRENTLY outside a transaction
-- to avoid table locks:
--   CREATE INDEX CONCURRENTLY listing_title_trgm ON "Listing" USING GIN (title gin_trgm_ops);
CREATE INDEX listing_title_trgm ON "Listing" USING GIN (title gin_trgm_ops);

-- GIN index on Listing.description for fast ILIKE / trigram text search
CREATE INDEX listing_desc_trgm ON "Listing" USING GIN (description gin_trgm_ops);
