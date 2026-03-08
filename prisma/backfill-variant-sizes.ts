/**
 * prisma/backfill-variant-sizes.ts
 *
 * Safe, additive backfill: for every ProductVariant that has a non-null `size`
 * field, create a corresponding VariantSize child row (if one doesn't already
 * exist).  The parent ProductVariant rows are NOT deleted — they continue to
 * work as before.  Going forward, new size inventory is managed via VariantSize.
 *
 * Run:
 *   npx ts-node --project tsconfig.json prisma/backfill-variant-sizes.ts
 *   -- or --
 *   npx tsx prisma/backfill-variant-sizes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const variants = await prisma.productVariant.findMany({
    where: { size: { not: null } },
    select: {
      id: true,
      sku: true,
      size: true,
      stock: true,
      priceInCents: true,
      active: true,
      sizes: { select: { id: true } }, // check if already migrated
    },
  });

  console.log(`Found ${variants.length} variant(s) with a size field.`);

  let created = 0;
  let skipped = 0;

  for (const v of variants) {
    if (v.sizes.length > 0) {
      skipped++;
      continue; // VariantSize row already exists for this variant
    }

    if (!v.size) continue;

    await prisma.variantSize.create({
      data: {
        variantId: v.id,
        size: v.size,
        sku: v.sku, // same SKU as the variant (already unique)
        stock: v.stock ?? 0,
        priceInCents: v.priceInCents ?? null,
        active: v.active,
      },
    });

    created++;
    console.log(`  ✓ ${v.sku} → VariantSize(${v.size})`);
  }

  console.log(`\nDone. Created: ${created}  Skipped (already had rows): ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
