import { prisma } from '@/lib/prisma';
import type { Season, WardrobeProduct } from '@/lib/wardrobeApi';
import type { Prisma } from '@prisma/client';

// Storefront types for product + variants
export type StorefrontVariant = {
  id: string;
  sku: string;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  images: string[];
  priceInCents: number; // price in öre, Klarna-ready
  stock: number;
  active: boolean;
};

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  materialId: string;
  materialName: string;
  priceInCents: number; // base price in öre
  priceClass: string;
  season: string;
  canonicalImage: string | null;
  // Flattened attributes from JSON for now
  attributes: Record<string, unknown> | null;
  variants: StorefrontVariant[];
};

type DbProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    material: true;
    variants: { include: { color: true } };
  };
}>;

function jsonArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function jsonObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const SEASONS: ReadonlySet<Season> = new Set<Season>([
  'spring',
  'summer',
  'autumn',
  'winter',
  'all',
]);

function toSeason(value: unknown): Season {
  if (typeof value !== 'string') return 'all';
  const normalized = value.trim().toLowerCase();
  return SEASONS.has(normalized as Season) ? (normalized as Season) : 'all';
}

function mapDbProductToWardrobe(product: DbProductWithRelations): WardrobeProduct {
  const firstVariant = product.variants?.[0];
  const variantImages = jsonArrayOfStrings(firstVariant?.images as unknown);
  const variantImage = variantImages[0];

  const image: string =
    product.canonicalImage || variantImage || '/product-w-001.svg';

  const price = product.priceInCents
    ? Math.round(product.priceInCents / 100)
    : 0;

  return {
    id: product.id,
    name: product.name,
    category: product.category?.id ?? 'other',
    style: (jsonObjectOrNull(product.attributes as unknown)?.style as string) ?? 'minimal',
    fit: (jsonObjectOrNull(product.attributes as unknown)?.fit as string) ?? 'regular',
    material: product.material?.name ?? 'cotton',
    color: firstVariant?.color?.name ?? 'white',
    season: toSeason(product.season),
    price,
    priceClass: (product.priceClass ||
      'standard') as WardrobeProduct['priceClass'],
    image,
  };
}

function mapDbProductToStorefront(product: DbProductWithRelations): StorefrontProduct {
  const basePriceInCents: number = product.priceInCents ?? 0;

  const variants: StorefrontVariant[] = (product.variants ?? [])
    .filter((v) => v && v.active)
    .map((v) => {
      const images = jsonArrayOfStrings(v.images as unknown);

      const priceInCents: number =
        typeof v.priceInCents === 'number' && Number.isInteger(v.priceInCents)
          ? v.priceInCents
          : basePriceInCents;

      return {
        id: String(v.id),
        sku: String(v.sku),
        colorId: v.color?.id ?? v.colorId ?? null,
        colorName: v.color?.name ?? null,
        colorHex: v.color?.hex ?? null,
        images,
        priceInCents,
        stock:
          typeof v.stock === 'number' && Number.isInteger(v.stock) && v.stock >= 0
            ? v.stock
            : 0,
        active: Boolean(v.active),
      } satisfies StorefrontVariant;
    });

  return {
    id: String(product.id),
    slug: String(product.slug),
    name: String(product.name),
    description: product.description ?? null,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? product.categoryId,
    materialId: product.materialId,
    materialName: product.material?.name ?? product.materialId,
    priceInCents: basePriceInCents,
    priceClass: product.priceClass ?? 'standard',
    season: product.season ?? 'all',
    canonicalImage: product.canonicalImage ?? null,
    attributes: jsonObjectOrNull(product.attributes as unknown),
    variants,
  } satisfies StorefrontProduct;
}

export async function getAllWardrobeProductsFromDb(): Promise<
  WardrobeProduct[]
> {
  const products = await prisma.product.findMany({
    where: { published: true },
    include: {
      category: true,
      material: true,
      variants: {
        where: { active: true },
        include: { color: true },
        orderBy: { sku: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return products.map(mapDbProductToWardrobe);
}

export async function getWardrobeProductByIdOrSlug(
  idOrSlug: string,
): Promise<WardrobeProduct | null> {
  const needle = decodeURIComponent(String(idOrSlug));

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: needle }, { slug: needle }],
    },
    include: {
      category: true,
      material: true,
      variants: {
        where: { active: true },
        include: { color: true },
        orderBy: { sku: 'asc' },
      },
    },
  });

  if (!product) return null;
  return mapDbProductToWardrobe(product);
}

export async function getStorefrontProductByIdOrSlug(
  idOrSlug: string,
): Promise<StorefrontProduct | null> {
  const needle = decodeURIComponent(String(idOrSlug));

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id: needle }, { slug: needle }],
      published: true,
    },
    include: {
      category: true,
      material: true,
      variants: {
        where: { active: true },
        include: { color: true },
        orderBy: { sku: 'asc' },
      },
    },
  });

  if (!product) return null;
  return mapDbProductToStorefront(product);
}
