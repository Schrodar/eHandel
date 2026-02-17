/*
  Warnings:

  - You are about to drop the column `city` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerFirst` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `customerLast` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `streetAddress` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalInclVat` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalVat` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `priceAtPurchaseOre` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `vatBasisPoints` on the `OrderItem` table. All the data in the column will be lost.
  - You are about to drop the column `canonicalImage` on the `Product` table. All the data in the column will be lost.
  - Added the required column `currency` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shipping` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingAddressLine1` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingCountry` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingPostalCode` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lineTotal` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productName` to the `OrderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('KLARNA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'CANCELLED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'READY_TO_PICK', 'PICKING', 'PACKED', 'SHIPPED', 'COMPLETED', 'CANCELLED');

-- DropIndex
DROP INDEX "Order_sessionId_idx";

-- DropIndex
DROP INDEX "Order_sessionId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "city",
DROP COLUMN "country",
DROP COLUMN "customerFirst",
DROP COLUMN "customerLast",
DROP COLUMN "metadata",
DROP COLUMN "postalCode",
DROP COLUMN "sessionId",
DROP COLUMN "status",
DROP COLUMN "streetAddress",
DROP COLUMN "totalInclVat",
DROP COLUMN "totalVat",
ADD COLUMN     "authorizedAt" TIMESTAMP(3),
ADD COLUMN     "billingAddressLine1" TEXT,
ADD COLUMN     "billingAddressLine2" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" TEXT,
ADD COLUMN     "billingPostalCode" TEXT,
ADD COLUMN     "capturedAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL,
ADD COLUMN     "customerName" TEXT NOT NULL,
ADD COLUMN     "discount" INTEGER NOT NULL,
ADD COLUMN     "orderStatus" "OrderStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'KLARNA',
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "shippedAt" TIMESTAMP(3),
ADD COLUMN     "shipping" INTEGER NOT NULL,
ADD COLUMN     "shippingAddressLine1" TEXT NOT NULL,
ADD COLUMN     "shippingAddressLine2" TEXT,
ADD COLUMN     "shippingCarrier" TEXT,
ADD COLUMN     "shippingCity" TEXT NOT NULL,
ADD COLUMN     "shippingCountry" TEXT NOT NULL,
ADD COLUMN     "shippingPostalCode" TEXT NOT NULL,
ADD COLUMN     "shippingTracking" TEXT,
ADD COLUMN     "subtotal" INTEGER NOT NULL,
ADD COLUMN     "tax" INTEGER NOT NULL,
ADD COLUMN     "total" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "priceAtPurchaseOre",
DROP COLUMN "vatBasisPoints",
ADD COLUMN     "lineTotal" INTEGER NOT NULL,
ADD COLUMN     "productName" TEXT NOT NULL,
ADD COLUMN     "unitPrice" INTEGER NOT NULL,
ADD COLUMN     "variantName" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "canonicalImage";

-- CreateIndex
CREATE INDEX "Order_paymentStatus_idx" ON "Order"("paymentStatus");

-- CreateIndex
CREATE INDEX "Order_orderStatus_idx" ON "Order"("orderStatus");
