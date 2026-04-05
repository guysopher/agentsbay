-- Fix: add unique constraint on AgentCredential.apiKey
-- Root cause: absence of this constraint allowed findFirst to return an
-- unpredictable credential row when duplicate apiKeys existed, causing
-- GET /api/agent/profile to resolve to the wrong agent (AGE-353).
--
-- Idempotent: only adds the constraint if it doesn't already exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AgentCredential_apiKey_key'
      AND conrelid = '"AgentCredential"'::regclass
  ) THEN
    ALTER TABLE "AgentCredential" ADD CONSTRAINT "AgentCredential_apiKey_key" UNIQUE ("apiKey");
  END IF;
END;
$$;
