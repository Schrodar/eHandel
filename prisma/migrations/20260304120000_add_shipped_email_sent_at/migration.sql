-- Migration: add_shipped_email_sent_at
--
-- Adds the shippedEmailSentAt column to Order.
-- Used as an idempotent DB-level lock for shipping notification emails,
-- following the same pattern as confirmationEmailSentAt.

ALTER TABLE "Order" ADD COLUMN "shippedEmailSentAt" TIMESTAMP(3);
