-- ─── Remove old single-use Coupon model from previous session ────────────────
DROP TABLE IF EXISTS "Coupon";
DROP TYPE IF EXISTS "CouponType";

-- ─── New enums ────────────────────────────────────────────────────────────────
CREATE TYPE "DiscountScope" AS ENUM ('GLOBAL', 'CATEGORY', 'PRODUCT', 'VARIANT');
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'AMOUNT', 'FREE_SHIPPING');
CREATE TYPE "DiscountUsageType" AS ENUM ('UNLIMITED', 'SINGLE_USE', 'MAX_USES');

-- ─── DiscountDrive ────────────────────────────────────────────────────────────
CREATE TABLE "DiscountDrive" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "scopeType"     "DiscountScope" NOT NULL,
    "categoryId"    TEXT,
    "productId"     TEXT,
    "variantId"     TEXT,
    "discountType"  "DiscountType" NOT NULL,
    "value"         INTEGER NOT NULL,
    "minOrderValue" INTEGER,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountDrive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscountDrive_active_idx" ON "DiscountDrive"("active");

-- ─── DiscountCode ─────────────────────────────────────────────────────────────
CREATE TABLE "DiscountCode" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "driveId"   TEXT NOT NULL,
    "usageType" "DiscountUsageType" NOT NULL,
    "maxUses"   INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "usedAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_driveId_idx" ON "DiscountCode"("driveId");
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");

ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_driveId_fkey"
    FOREIGN KEY ("driveId") REFERENCES "DiscountDrive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Order: replace couponCode with richer discount tracking ──────────────────
ALTER TABLE "Order" RENAME COLUMN "couponCode" TO "appliedDiscountCode";
ALTER TABLE "Order" ADD COLUMN "appliedDriveId" TEXT;
