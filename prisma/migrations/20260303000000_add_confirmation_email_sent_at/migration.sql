-- Migration: add confirmationEmailSentAt to Order
-- Used for idempotent email dispatch: a non-null value means confirmation email has been sent

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "confirmationEmailSentAt" TIMESTAMP(3);
