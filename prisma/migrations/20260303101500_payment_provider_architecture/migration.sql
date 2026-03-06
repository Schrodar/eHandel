ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'STRIPE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CheckoutOrderStatus') THEN
    CREATE TYPE "CheckoutOrderStatus" AS ENUM (
      'CREATED',
      'AUTHORIZED',
      'CAPTURED',
      'FULFILLED',
      'CANCELLED',
      'REFUNDED'
    );
  END IF;
END $$;

ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider" NOT NULL DEFAULT 'KLARNA',
  ADD COLUMN IF NOT EXISTS "status" "CheckoutOrderStatus" NOT NULL DEFAULT 'CREATED',
  ADD COLUMN IF NOT EXISTS "providerOrderId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPaymentId" TEXT,
  ADD COLUMN IF NOT EXISTS "amountTotal" INTEGER,
  ADD COLUMN IF NOT EXISTS "shippingAddress" JSONB;

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "snapshotName" TEXT,
  ADD COLUMN IF NOT EXISTS "snapshotUnitAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "snapshotImageUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Order_providerOrderId_key" ON "Order"("providerOrderId");
CREATE INDEX IF NOT EXISTS "Order_provider_status_idx" ON "Order"("provider", "status");
