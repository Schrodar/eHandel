-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "klarnaOrderId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "customerEmail" TEXT NOT NULL,
    "customerFirst" TEXT,
    "customerLast" TEXT,
    "customerPhone" TEXT,
    "streetAddress" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "country" TEXT,
    "totalInclVat" INTEGER NOT NULL,
    "totalVat" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "priceAtPurchaseOre" INTEGER NOT NULL,
    "vatBasisPoints" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetFolder" (
    "assetId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetFolder_pkey" PRIMARY KEY ("assetId","folderId")
);

-- CreateTable
CREATE TABLE "VariantImage" (
    "variantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'secondary',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantImage_pkey" PRIMARY KEY ("variantId","assetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_klarnaOrderId_key" ON "Order"("klarnaOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_sessionId_key" ON "Order"("sessionId");

-- CreateIndex
CREATE INDEX "Order_sessionId_idx" ON "Order"("sessionId");

-- CreateIndex
CREATE INDEX "Order_klarnaOrderId_idx" ON "Order"("klarnaOrderId");

-- CreateIndex
CREATE INDEX "Folder_parentId_idx" ON "Folder"("parentId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "AssetFolder_folderId_idx" ON "AssetFolder"("folderId");

-- CreateIndex
CREATE INDEX "VariantImage_variantId_sortOrder_idx" ON "VariantImage"("variantId", "sortOrder");

-- CreateIndex
CREATE INDEX "VariantImage_assetId_idx" ON "VariantImage"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantImage_variantId_role_key" ON "VariantImage"("variantId", "role");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFolder" ADD CONSTRAINT "AssetFolder_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetFolder" ADD CONSTRAINT "AssetFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantImage" ADD CONSTRAINT "VariantImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantImage" ADD CONSTRAINT "VariantImage_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
