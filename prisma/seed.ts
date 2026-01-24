// prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

type JsonInput = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;

async function loadJSON<T = unknown>(fileName: string): Promise<T> {
  const p = path.join(process.cwd(), 'prisma', 'seed-data', fileName);
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as T;
}

function pickString(...candidates: Array<unknown>): string | undefined {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const s = c.trim();
      if (s.length > 0) return s;
    }
  }
  return undefined;
}

function pickNumber(...candidates: Array<unknown>): number | undefined {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  return undefined;
}

function pickBoolean(...candidates: Array<unknown>): boolean | undefined {
  for (const c of candidates) {
    if (typeof c === 'boolean') return c;
  }
  return undefined;
}

function asJsonOrUndefined(value: unknown): JsonInput | undefined {
  if (value === undefined) return undefined;
  // JSON.parse already yields Json-compatible values, but TS behöver hjälp med typen.
  return value as JsonInput;
}

function requireField<T>(
  value: T | undefined,
  label: string,
  context: string,
): T {
  if (value === undefined) {
    throw new Error(`Missing required field "${label}" for ${context}`);
  }
  return value;
}

async function main() {
  // 1) colors
  const colors =
    await loadJSON<Array<{ id: string; name: string; hex?: string }>>(
      'colors.json',
    );
  for (const c of colors) {
    const id = requireField(
      pickString(c.id),
      'id',
      `Color(${JSON.stringify(c)})`,
    );
    const name = requireField(pickString(c.name), 'name', `Color(${id})`);
    const hex = pickString(c.hex) ?? null;

    await prisma.color.upsert({
      where: { id },
      update: { name, hex },
      create: { id, name, hex },
    });
  }

  // 2) categories
  const categories =
    await loadJSON<Array<{ id: string; name: string }>>('categories.json');
  for (const cat of categories) {
    const id = requireField(
      pickString(cat.id),
      'id',
      `Category(${JSON.stringify(cat)})`,
    );
    const name = requireField(pickString(cat.name), 'name', `Category(${id})`);

    await prisma.category.upsert({
      where: { id },
      update: { name },
      create: { id, name },
    });
  }

  // 3) materials
  const materials =
    await loadJSON<Array<{ id: string; name: string }>>('materials.json');
  for (const m of materials) {
    const id = requireField(
      pickString(m.id),
      'id',
      `Material(${JSON.stringify(m)})`,
    );
    const name = requireField(pickString(m.name), 'name', `Material(${id})`);

    await prisma.material.upsert({
      where: { id },
      update: { name },
      create: { id, name },
    });
  }

  // 4) products
  const products =
    await loadJSON<Array<Record<string, unknown>>>('products.json');
  for (const p of products) {
    const id = requireField(
      pickString(p.id),
      'id',
      `Product(${JSON.stringify(p)})`,
    );
    const slug = requireField(pickString(p.slug), 'slug', `Product(${id})`);
    const name = requireField(
      pickString(p.title, p.name),
      'name/title',
      `Product(${id})`,
    );

    // REQUIRED by schema in your updated schema.prisma
    const categoryId = requireField(
      pickString(p.categoryId, p.category_id),
      'categoryId/category_id',
      `Product(${id})`,
    );
    const materialId = requireField(
      pickString(p.materialId, p.material_id),
      'materialId/material_id',
      `Product(${id})`,
    );

    const description = pickString(p.description) ?? null;
    const canonicalImage =
      pickString(p.canonicalImage, p.canonical_image) ?? null;

    const priceInCents = pickNumber(p.priceInCents, p.price_in_cents) ?? 0;

    // Optional in schema because of @default(...) — omit if missing to use DB defaults
    const priceClass = pickString(p.priceClass, p.price_class);
    const season = pickString(p.season);

    const attributes = asJsonOrUndefined(p.attributes);

    const published = pickBoolean(p.published, p.active) ?? true;

    await prisma.product.upsert({
      where: { id },
      update: {
        slug,
        name,
        description,
        categoryId,
        materialId,
        priceInCents,
        ...(priceClass ? { priceClass } : {}),
        ...(season ? { season } : {}),
        canonicalImage,
        attributes,
        published,
      },
      create: {
        id,
        slug,
        name,
        description,
        categoryId,
        materialId,
        priceInCents,
        ...(priceClass ? { priceClass } : {}),
        ...(season ? { season } : {}),
        canonicalImage,
        attributes,
        published,
      },
    });
  }

  // 5) product_variants
  const variants = await loadJSON<Array<Record<string, unknown>>>(
    'product_variants.json',
  );
  for (const v of variants) {
    const id = requireField(
      pickString(v.id),
      'id',
      `ProductVariant(${JSON.stringify(v)})`,
    );

    const productId = requireField(
      pickString(v.productId, v.product_id),
      'productId/product_id',
      `ProductVariant(${id})`,
    );

    // REQUIRED by schema in your updated schema.prisma
    const sku = requireField(pickString(v.sku), 'sku', `ProductVariant(${id})`);

    const colorId = pickString(v.colorId, v.color_id) ?? null;
    const images = asJsonOrUndefined(v.images);
    const attributes = asJsonOrUndefined(v.attributes);

    // Optional override (nullable)
    const priceInCents = pickNumber(v.priceInCents, v.price_in_cents);

    // stock is Int @default(0) (NOT nullable). Always write a number.
    const stock = pickNumber(v.stock) ?? 0;

    const active = pickBoolean(v.active) ?? true;

    await prisma.productVariant.upsert({
      where: { id },
      update: {
        sku,
        productId,
        colorId,
        images,
        ...(priceInCents !== undefined ? { priceInCents } : {}),
        stock,
        attributes,
        active,
      },
      create: {
        id,
        sku,
        productId,
        colorId,
        images,
        ...(priceInCents !== undefined ? { priceInCents } : {}),
        stock,
        attributes,
        active,
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
