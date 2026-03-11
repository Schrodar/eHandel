import { prisma } from '@/lib/prisma';
import type { Season, WardrobeProduct } from '@/lib/wardrobeApi';
import type { Prisma } from '@prisma/client';
import { getPrimaryImage, type VariantWithImages } from '@/lib/mediaPolicy';

// ─── Storefront types ─────────────────────────────────────────────────────────

/** Storefront variant maps directly to one ProductVariant row. */
export type StorefrontVariant = {
  id: string;
  sku: string;
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  size: string | null;
  images: string[];
  priceInCents: number; // base / fallback price in öre
  stock: number; // total available stock across all sizes
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
  priceInCents: number;
  priceClass: string;
  season: string;
  attributes: Record<string, unknown> | null;
  variants: StorefrontVariant[];
};

// ─── DB payload type ──────────────────────────────────────────────────────────

type DbProductWithRelations = Prisma.ProductGetPayload<{
  include: {
    category: true;
    material: true;
    defaultVariant: {
      include: { variantImages: { include: { asset: true } } };
    };
    variants: {
      include: {
        color: true;
        variantImages: { include: { asset: true } };
      };
    };
  };
}>;

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

function resolveBasePriceInCents(product: DbProductWithRelations): number {
  if (typeof product.priceInCents === 'number') return product.priceInCents;

  const defaultPrice = product.defaultVariant?.priceInCents;
  if (typeof defaultPrice === 'number') return defaultPrice;

  const activeVariant = product.variants.find(
    (variant) => variant.active && typeof variant.priceInCents === 'number',
  );
  if (activeVariant?.priceInCents != null) return activeVariant.priceInCents;

  const anyVariant = product.variants.find(
    (variant) => typeof variant.priceInCents === 'number',
  );
  return anyVariant?.priceInCents ?? 0;
}

function getVariantImageUrls(
  variant: DbProductWithRelations['variants'][number],
): string[] {
  if (!variant.variantImages?.length) return [];
  return variant.variantImages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((vi) => vi.asset?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

function mapDbProductToWardrobe(
  product: DbProductWithRelations,
): WardrobeProduct {
  // Priority 1: defaultVariant primary image
  let image = '';
  if (product.defaultVariant) {
    const primaryImage = getPrimaryImage(
      product.defaultVariant as VariantWithImages,
    );
    if (primaryImage?.url) {
      image = primaryImage.url;
    }
  }

  // Priority 2: first active variant primary image
  if (!image) {
    for (const variant of product.variants) {
      if (variant.active) {
        const primaryImage = getPrimaryImage(variant as VariantWithImages);
        if (primaryImage?.url) {
          image = primaryImage.url;
          break;
        }
      }
    }
  }

  // Priority 3: first variant primary image
  if (!image) {
    const firstVariant = product.variants?.[0];
    if (firstVariant) {
      const primaryImage = getPrimaryImage(firstVariant as VariantWithImages);
      if (primaryImage?.url) {
        image = primaryImage.url;
      }
    }
  }

  // Fallback
  if (!image) {
    image = '/product-w-001.svg';
  }

  const price = Math.round(resolveBasePriceInCents(product) / 100);

  return {
    id: product.id,
    name: product.name,
    category: product.category?.name ?? 'Annat',
    style:
      (jsonObjectOrNull(product.attributes as unknown)?.style as string) ??
      'minimal',
    fit:
      (jsonObjectOrNull(product.attributes as unknown)?.fit as string) ??
      'regular',
    material: product.material?.name ?? 'cotton',
    color: product.variants?.[0]?.color?.name ?? 'white',
    season: toSeason(product.season),
    price,
    priceClass: (product.priceClass ||
      'standard') as WardrobeProduct['priceClass'],
    image,
  };
}

function mapDbProductToStorefront(
  product: DbProductWithRelations,
): StorefrontProduct {
  const basePriceInCents = resolveBasePriceInCents(product);

  const variants: StorefrontVariant[] = [];

  for (const v of product.variants ?? []) {
    if (!v || !v.active) continue;

    const images = getVariantImageUrls(v);
    const variantPriceInCents =
      typeof v.priceInCents === 'number' && Number.isInteger(v.priceInCents)
        ? v.priceInCents
        : basePriceInCents;

    const colorId = v.color?.id ?? v.colorId ?? null;
    const colorName = v.color?.name ?? null;
    const colorHex = v.color?.hex ?? null;
    const size =
      'size' in v ? ((v as { size?: string | null }).size ?? null) : null;

    variants.push({
      id: String(v.id),
      sku: String(v.sku),
      colorId,
      colorName,
      colorHex,
      size,
      images,
      priceInCents: variantPriceInCents,
      stock:
        typeof v.stock === 'number' && Number.isInteger(v.stock) && v.stock >= 0
          ? v.stock
          : 0,
      active: Boolean(v.active),
    } satisfies StorefrontVariant);
  }

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
      defaultVariant: {
        include: { variantImages: { include: { asset: true } } },
      },
      variants: {
        include: {
          color: true,
          variantImages: { include: { asset: true } },
        },
        orderBy: { sku: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return products.map(mapDbProductToWardrobe);
}

/**
 * Lean shop-list query — only fetches the fields needed to render product
 * cards on /shop.  Compared to getAllWardrobeProductsFromDb it skips:
 *   • All non-primary variant images
 *   • Inactive variants beyond the first 3 (for color/price resolution)
 *   • Full asset record (only url)
 *
 * This reduces the DB payload by ~60-80 % for a typical catalogue.
 */
export async function getAllShopListProducts(): Promise<WardrobeProduct[]> {
  const products = await prisma.product.findMany({
    where: { published: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      priceInCents: true,
      priceClass: true,
      season: true,
      attributes: true,
      category: { select: { name: true } },
      material: { select: { name: true } },
      // Default variant: only its primary image URL
      defaultVariant: {
        select: {
          priceInCents: true,
          variantImages: {
            where: { role: 'primary' },
            take: 1,
            select: { asset: { select: { url: true } } },
          },
        },
      },
      // Active variants only, limit 3 (enough for color fallback + price)
      variants: {
        where: { active: true },
        take: 3,
        orderBy: { sku: 'asc' },
        select: {
          priceInCents: true,
          color: { select: { name: true } },
          variantImages: {
            where: { role: 'primary' },
            take: 1,
            select: { asset: { select: { url: true } } },
          },
        },
      },
    },
  });

  return products.map((product): WardrobeProduct => {
    const image =
      product.defaultVariant?.variantImages[0]?.asset.url ||
      product.variants.find((v) => v.variantImages[0]?.asset.url)
        ?.variantImages[0]?.asset.url ||
      '/product-w-001.svg';

    const rawPrice =
      product.priceInCents ??
      product.defaultVariant?.priceInCents ??
      product.variants.find((v) => v.priceInCents != null)?.priceInCents ??
      0;
    const price = Math.round(rawPrice / 100);

    const attrs = jsonObjectOrNull(product.attributes);

    return {
      id: product.id,
      name: product.name,
      category: product.category?.name ?? 'Annat',
      style: (attrs?.style as string) ?? 'minimal',
      fit: (attrs?.fit as string) ?? 'regular',
      material: product.material?.name ?? 'cotton',
      color: product.variants[0]?.color?.name ?? 'white',
      season: toSeason(product.season),
      price,
      priceClass: (product.priceClass ||
        'standard') as WardrobeProduct['priceClass'],
      image,
    };
  });
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
      defaultVariant: {
        include: { variantImages: { include: { asset: true } } },
      },
      variants: {
        include: {
          color: true,
          variantImages: { include: { asset: true } },
        },
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
      defaultVariant: {
        include: { variantImages: { include: { asset: true } } },
      },
      variants: {
        include: {
          color: true,
          variantImages: { include: { asset: true } },
        },
        orderBy: { sku: 'asc' },
      },
    },
  });

  if (!product) return null;
  return mapDbProductToStorefront(product);
}
