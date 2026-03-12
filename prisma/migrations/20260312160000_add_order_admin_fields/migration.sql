-- Add admin-only fields to Order table
-- adminNote: internal notes visible only in admin
-- flagged: flag an order for follow-up

ALTER TABLE "Order" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;

-- Index for history queries (filter SHIPPED orders older than 24 h)
CREATE INDEX IF NOT EXISTS "Order_shippedAt_idx" ON "Order"("shippedAt");
