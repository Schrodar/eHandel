-- Migration: add VariantSize model
-- Additive only – no existing data is removed or altered.
-- The ProductVariant.size column is kept for backward-compat during migration.

CREATE TABLE "VariantSize" (
    "id"           TEXT NOT NULL,
    "variantId"    TEXT NOT NULL,
    "size"         TEXT NOT NULL,
    "sku"          TEXT NOT NULL,
    "stock"        INTEGER NOT NULL DEFAULT 0,
    "priceInCents" INTEGER,
    "active"       BOOLEAN NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantSize_pkey" PRIMARY KEY ("id")
);

-- Unique: one SKU per size row (commerce requirement)
CREATE UNIQUE INDEX "VariantSize_sku_key" ON "VariantSize"("sku");

-- Unique: one size per visual variant
CREATE UNIQUE INDEX "VariantSize_variantId_size_key" ON "VariantSize"("variantId", "size");

-- Index for fast variant→sizes lookups
CREATE INDEX "VariantSize_variantId_idx" ON "VariantSize"("variantId");

-- FK: cascade delete when the parent visual variant is removed
ALTER TABLE "VariantSize"
    ADD CONSTRAINT "VariantSize_variantId_fkey"
    FOREIGN KEY ("variantId")
    REFERENCES "ProductVariant"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
