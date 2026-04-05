-- Add composite index on Review(createdAt, revieweeId) to support
-- leaderboard time-window queries (window=30d / window=7d) that filter
-- reviews by recency and then group by revieweeId.
CREATE INDEX "Review_createdAt_revieweeId_idx" ON "Review"("createdAt", "revieweeId");
