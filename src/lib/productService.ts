import { prisma } from '@/lib/prisma';
import type { WardrobeProduct } from '@/lib/wardrobeApi';

function mapDbProductToWardrobe(product: any): WardrobeProduct {
  const firstVariant = product.variants?.[0];
  const variantImage = Array.isArray(firstVariant?.images)
    ? firstVariant.images[0]
    : undefined;

  const image: string =
    product.canonicalImage || variantImage || '/product-w-001.svg';

  const price = product.priceInCents
    ? Math.round(product.priceInCents / 100)
    : 0;

  return {
    id: product.id,
    name: product.name,
    category: product.category?.id ?? 'other',
    style: product.attributes?.style ?? 'minimal',
    fit: product.attributes?.fit ?? 'regular',
    material: product.material?.name ?? 'cotton',
    color: firstVariant?.color?.name ?? 'white',
    season: product.season ?? 'all',
    price,
    priceClass: (product.priceClass ||
      'standard') as WardrobeProduct['priceClass'],
    image,
  };
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
