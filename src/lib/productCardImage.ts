import { prisma } from '@/lib/prisma';
import { getPrimaryImage, type VariantWithImages } from '@/lib/mediaPolicy';
import type { Prisma } from '@prisma/client';

// Minimal structural type accepted by getProductCardImage / getProductCardImageId.
// Both the full Prisma ProductWithVariants and leaner SELECT-based ProductRow satisfy it.
type CardVariantImage = {
  role: string;
  asset: { url: string | null; id?: string | null } | null;
};
type CardVariant = { active?: boolean | null; variantImages: CardVariantImage[] };

export type ProductForCardImage = {
  defaultVariant?: CardVariant | null;
  variants: CardVariant[];
};

// Full Prisma type used by getProductForCardImage (DB fetch helper).
type ProductWithVariants = Prisma.ProductGetPayload<{
  include: {
    defaultVariant: {
      include: { variantImages: { include: { asset: true } } };
    };
    variants: { include: { variantImages: { include: { asset: true } } } };
  };
}>;

/**
 * Get the representative image URL for a product card.
 * Returns null if no valid image found.
 *
 * Priority:
 * 1. defaultVariant primary image (if valid)
 * 2. First active variant with valid primary image
 * 3. First variant with valid primary image (regardless of active status)
 * 4. null
 */
export function getProductCardImage(
  product: ProductForCardImage,
): string | null {
  // Priority 1: defaultVariant with valid primary image
  if (product.defaultVariant) {
    const primaryImage = getPrimaryImage(product.defaultVariant as VariantWithImages);
    if (primaryImage?.url) {
      return primaryImage.url;
    }
  }

  // Priority 2: first active variant with valid primary image
  for (const variant of product.variants) {
    if (variant.active) {
      const primaryImage = getPrimaryImage(variant as VariantWithImages);
      if (primaryImage?.url) {
        return primaryImage.url;
      }
    }
  }

  // Priority 3: first variant with valid primary image (any status)
  for (const variant of product.variants) {
    const primaryImage = getPrimaryImage(variant as VariantWithImages);
    if (primaryImage?.url) {
      return primaryImage.url;
    }
  }

  return null;
}

/**
 * Get the representative image ID for a product card (for database queries).
 * Returns null if no valid image found.
 */
export function getProductCardImageId(
  product: ProductForCardImage,
): string | null {
  // Priority 1: defaultVariant with valid primary image
  if (product.defaultVariant) {
    const primaryImage = getPrimaryImage(product.defaultVariant as VariantWithImages);
    if (primaryImage?.id) {
      return primaryImage.id;
    }
  }

  // Priority 2: first active variant with valid primary image
  for (const variant of product.variants) {
    if (variant.active) {
      const primaryImage = getPrimaryImage(variant as VariantWithImages);
      if (primaryImage?.id) {
        return primaryImage.id;
      }
    }
  }

  // Priority 3: first variant with valid primary image (any status)
  for (const variant of product.variants) {
    const primaryImage = getPrimaryImage(variant as VariantWithImages);
    if (primaryImage?.id) {
      return primaryImage.id;
    }
  }

  return null;
}

/**
 * Fetch product with variants needed for card image lookup.
 */
export async function getProductForCardImage(
  productId: string,
): Promise<ProductWithVariants | null> {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      defaultVariant: {
        include: { variantImages: { include: { asset: true } } },
      },
      variants: { include: { variantImages: { include: { asset: true } } } },
    },
  });
}

