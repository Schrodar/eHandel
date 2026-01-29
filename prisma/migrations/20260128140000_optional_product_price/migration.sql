-- Make product price optional (variant-driven pricing)
ALTER TABLE "Product" ALTER COLUMN "priceInCents" DROP NOT NULL;
