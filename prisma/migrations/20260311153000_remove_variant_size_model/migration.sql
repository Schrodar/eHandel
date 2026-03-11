-- Migrate VariantSize rows into ProductVariant rows, then remove VariantSize.
-- Each size row becomes a standalone purchasable ProductVariant.

INSERT INTO "ProductVariant" (
  "id",
  "sku",
  "productId",
  "colorId",
  "size",
  "images",
  "priceInCents",
  "stock",
  "attributes",
  "active"
)
SELECT
  vs."sku" AS "id",
  vs."sku" AS "sku",
  pv."productId",
  pv."colorId",
  vs."size",
  pv."images",
  COALESCE(vs."priceInCents", pv."priceInCents") AS "priceInCents",
  vs."stock",
  pv."attributes",
  (pv."active" AND vs."active") AS "active"
FROM "VariantSize" vs
JOIN "ProductVariant" pv ON pv."id" = vs."variantId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "ProductVariant" existing
  WHERE existing."id" = vs."sku" OR existing."sku" = vs."sku"
);

-- Copy media links from parent variant to newly created size variants.
INSERT INTO "VariantImage" ("variantId", "assetId", "role", "sortOrder")
SELECT
  vs."sku" AS "variantId",
  vi."assetId",
  vi."role",
  vi."sortOrder"
FROM "VariantSize" vs
JOIN "VariantImage" vi ON vi."variantId" = vs."variantId"
LEFT JOIN "VariantImage" existing
  ON existing."variantId" = vs."sku"
 AND existing."assetId" = vi."assetId"
WHERE existing."assetId" IS NULL;

DROP TABLE IF EXISTS "VariantSize";
