-- Migration: add_order_event_outbox
--
-- Adds the OrderEvent table used as a transactional outbox.
-- Events are created in the same DB transaction as the order state change,
-- then processed by the outbox processor (best-effort, idempotent).

CREATE TYPE "OrderEventType" AS ENUM ('ORDER_PAID', 'ORDER_SHIPPED');

CREATE TABLE "OrderEvent" (
    "id"             TEXT        NOT NULL,
    "type"           "OrderEventType" NOT NULL,
    "orderId"        TEXT        NOT NULL,
    "payload"        JSONB       NOT NULL,
    "idempotencyKey" TEXT        NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"    TIMESTAMP(3),
    "attempts"       INTEGER     NOT NULL DEFAULT 0,
    "lastError"      TEXT,
    "lockedAt"       TIMESTAMP(3),
    "lockedBy"       TEXT,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderEvent"
    ADD CONSTRAINT "OrderEvent_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "OrderEvent_idempotencyKey_key" ON "OrderEvent"("idempotencyKey");
CREATE INDEX "OrderEvent_processedAt_createdAt_idx" ON "OrderEvent"("processedAt", "createdAt");
CREATE INDEX "OrderEvent_type_processedAt_idx" ON "OrderEvent"("type", "processedAt");
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");
