-- Migration: add publicToken for safe public order status polling
-- Each Order gets a random, unguessable token that the client must present
-- to read order status via the public GET /api/orders/:id endpoint.
-- This prevents enumeration / PII leakage against guessable CUID order IDs.

ALTER TABLE "Order" ADD COLUMN "publicToken" TEXT;

-- Backfill existing orders (gen_random_uuid requires pgcrypto on Postgres < 13;
-- on Postgres 13+ it is available as a built-in function).
-- Supabase runs Postgres 15, so gen_random_uuid() is available by default.
UPDATE "Order" SET "publicToken" = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "publicToken" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "publicToken" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_publicToken_key" UNIQUE ("publicToken");
