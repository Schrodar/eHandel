-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateTable: Coupon (single-use discount codes)
CREATE TABLE "Coupon" (
    "id"          TEXT NOT NULL,
    "code"        TEXT NOT NULL,
    "type"        "CouponType" NOT NULL,
    "value"       INTEGER NOT NULL,
    "usedAt"      TIMESTAMP(3),
    "usedOrderId" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- Add couponCode snapshot to Order (nullable – orders without coupons stay clean)
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
