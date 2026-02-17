/**
 * Migration script: Move images from ProductVariant.images (JSON)
 * and Product.canonicalImage to new Asset + VariantImage structure.
 *
 * Run from Prisma seed context or as a standalone script.
 * Can be called from: prisma/seed.ts or via a Next.js API route.
 */

import { prisma } from '@/lib/prisma';

/**
 * Parse variant.images JSON as array of image URLs/objects.
 */
function parseVariantImagesJson(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) {
    return images
      .map((img) => (typeof img === 'string' ? img : img?.url))
      .filter((url): url is string => typeof url === 'string' && !!url.trim());
  }
  return [];
}

/**
 * Migrate all existing images to Asset + VariantImage.
 */
export async function migrateImagesToAssets() {
  console.log(
    '[Migration] Starting image migration to Asset + VariantImage...',
  );

  // Collect all unique URLs to deduplicate Assets
  const urlToAssetId = new Map<string, string>();

  // 1. Process ProductVariant.images (JSON array)
  const variants = await prisma.productVariant.findMany({
    select: { id: true, images: true },
  });

  console.log(
    `[Migration] Processing ${variants.length} variants with images...`,
  );

  for (const variant of variants) {
    const imageUrls = parseVariantImagesJson(variant.images);
    console.log(`  Variant ${variant.id}: ${imageUrls.length} images`);

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]!.trim();
      if (!url) continue;

      // Create or reuse Asset
      let assetId = urlToAssetId.get(url);
      if (!assetId) {
        const asset = await prisma.asset.create({
          data: {
            type: 'image',
            status: 'ready',
            url,
            alt: null,
          },
        });
        assetId = asset.id;
        urlToAssetId.set(url, assetId);
      }

      // Create VariantImage
      try {
        await prisma.variantImage.create({
          data: {
            variantId: variant.id,
            assetId,
            role: i === 0 ? 'primary' : 'secondary',
            sortOrder: i,
          },
        });
      } catch (err) {
        // Might already exist, skip
        console.log(
          `    ⚠ VariantImage already exists for ${variant.id} + ${assetId}`,
        );
      }
    }
  }

  // 2. Process Product.canonicalImage - DEPRECATED: canonicalImage field removed from schema
  // All product images now come from variant.variantImages
  console.log(
    `[Migration] Skipping product canonical images (migrated to variant images)`,
  );

  console.log('[Migration] ✅ Image migration complete');
  console.log(`[Migration] Created ${urlToAssetId.size} unique assets`);
  return {
    assetsCreated: urlToAssetId.size,
    variantsProcessed: variants.length,
    productsProcessed: 0,
  };
}

/**
 * Verify migration completeness (can be called after migration).
 */
export async function verifyMigration() {
  const totalAssets = await prisma.asset.count();
  const totalVariantImages = await prisma.variantImage.count();
  const variantsWithPrimary = await prisma.variantImage.groupBy({
    by: ['variantId'],
    where: { role: 'primary' },
    _count: { variantId: true },
  });

  console.log('[Migration] Verification:');
  console.log(`  - Assets: ${totalAssets}`);
  console.log(`  - VariantImages: ${totalVariantImages}`);
  console.log(`  - Variants with primary image: ${variantsWithPrimary.length}`);

  return {
    totalAssets,
    totalVariantImages,
    variantsWithPrimary: variantsWithPrimary.length,
  };
}
