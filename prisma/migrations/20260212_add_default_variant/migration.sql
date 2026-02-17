-- Add defaultVariantId to Product table
ALTER TABLE "Product" ADD COLUMN "defaultVariantId" TEXT;

-- Add unique constraint for one-to-one relationship
ALTER TABLE "Product" ADD CONSTRAINT "Product_defaultVariantId_key" UNIQUE ("defaultVariantId");

-- Add foreign key constraint
ALTER TABLE "Product" ADD CONSTRAINT "Product_defaultVariantId_fkey" FOREIGN KEY ("defaultVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for faster lookups
CREATE INDEX "Product_defaultVariantId_idx" ON "Product"("defaultVariantId");
