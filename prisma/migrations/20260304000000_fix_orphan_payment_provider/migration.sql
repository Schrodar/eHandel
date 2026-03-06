-- Migration: fix_orphan_payment_provider
--
-- The paymentProvider column was added in 20260212224650_rebuild_order_domain
-- with DEFAULT 'KLARNA'. After the Stripe integration was made the primary
-- payment path, the Prisma schema switched to the 'provider' String field
-- (default 'STRIPE'), leaving paymentProvider as an orphaned DB column that
-- still defaults to 'KLARNA' for every new Stripe order.
--
-- This migration:
--  1. Back-fills all existing Stripe orders (provider='STRIPE') to also have
--     paymentProvider='STRIPE'.
--  2. Changes the column default to 'STRIPE', matching the provider field.
--
-- No application code changes are required; the Prisma schema does not expose
-- paymentProvider. If you wish to drop it entirely, see the commented-out
-- statement at the bottom.

-- 1. Back-fill Stripe orders
UPDATE "Order"
SET    "paymentProvider" = 'STRIPE'
WHERE  "provider" = 'STRIPE';

-- 2. Change the column DEFAULT so future inserts also get STRIPE
ALTER TABLE "Order"
  ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';

-- Optional (non-destructive alternative): drop the redundant column entirely.
-- Uncomment only after confirming no external system reads paymentProvider.
-- ALTER TABLE "Order" DROP COLUMN "paymentProvider";
