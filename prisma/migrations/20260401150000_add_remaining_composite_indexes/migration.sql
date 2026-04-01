-- Add remaining composite indexes for listing search and negotiation queries
-- status+category+createdAt covers category-filtered listing searches
-- status+price covers price-sorted listing results
CREATE INDEX "Listing_status_category_createdAt_idx" ON "Listing"("status", "category", "createdAt");
CREATE INDEX "Listing_status_price_idx" ON "Listing"("status", "price");

-- NegotiationThread: status+updatedAt for thread management queries
CREATE INDEX "NegotiationThread_status_updatedAt_idx" ON "NegotiationThread"("status", "updatedAt");
