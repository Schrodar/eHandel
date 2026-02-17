import { prisma } from '@/lib/prisma';
import type { Season, WardrobeProduct } from '@/lib/wardrobeApi';
import type { Prisma } from '@prisma/client';
import { getPrimaryImage } from '@/lib/mediaPolicy';

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
  // Flattened attributes from JSON for now
  attributes: Record<string, unknown> | null;
  variants: StorefrontVariant[];
};

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
    const primaryImage = getPrimaryImage(product.defaultVariant as any);
    if (primaryImage?.url) {
      image = primaryImage.url;
    }
  }

  // Priority 2: first active variant primary image
  if (!image) {
    for (const variant of product.variants) {
      if (variant.active) {
        const primaryImage = getPrimaryImage(variant as any);
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
      const primaryImage = getPrimaryImage(firstVariant as any);
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

  const variants: StorefrontVariant[] = (product.variants ?? [])
    .filter((v) => v && v.active)
    .map((v) => {
      const images = getVariantImageUrls(v);

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
          typeof v.stock === 'number' &&
          Number.isInteger(v.stock) &&
          v.stock >= 0
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
