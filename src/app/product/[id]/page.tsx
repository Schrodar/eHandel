import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';
import { SAMPLE_WARDROBE } from '@/lib/wardrobeApi';
import type { Metadata } from 'next';
import {
  getStorefrontProductByIdOrSlug,
  type StorefrontProduct,
} from '@/lib/productService';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // `params` can be a Promise in some Next.js runtimes — await to unwrap
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedParams = (await (params as any)) as { id: string };

  const productFromDb: StorefrontProduct | null =
    await getStorefrontProductByIdOrSlug(resolvedParams.id);
  const fallback = SAMPLE_WARDROBE.find((p) => p.id === resolvedParams.id);

  if (!productFromDb && !fallback) {
    return { title: 'Product not found' };
  }

  const name = productFromDb?.name ?? fallback!.name;
  const material = productFromDb?.materialName ?? fallback!.material;
  const imagePath = productFromDb?.canonicalImage ?? fallback!.image;

  const siteUrl =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://example.com';
  const canonical = new URL(
    `/product/${productFromDb?.slug ?? fallback!.id}`,
    siteUrl,
  ).toString();
  const imageUrl = imagePath.startsWith('http')
    ? imagePath
    : new URL(imagePath, siteUrl).toString();

  return {
    title: `${name} — SAZZE`,
    description: `${name}. ${material}.`,
    openGraph: {
      title: `${name} — SAZZE`,
      description: `${name}. ${material}.`,
      url: canonical,
      images: [
        {
          url: imageUrl,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — SAZZE`,
      description: `${name}. ${material}.`,
      images: [imageUrl],
    },
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  // `params` may be a Promise in newer Next.js runtimes — unwrap it
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedParams = (await (params as any)) as { id: string };
  const productFromDb: StorefrontProduct | null =
    await getStorefrontProductByIdOrSlug(resolvedParams.id);
  const fallback = SAMPLE_WARDROBE.find((p) => p.id === resolvedParams.id);

  if (!productFromDb && !fallback) return notFound();

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: productFromDb?.name ?? fallback!.name,
    image: [
      productFromDb?.canonicalImage ??
        (fallback ? fallback.image : '/product-placeholder.png'),
    ],
    description: `${productFromDb?.name ?? fallback!.name} — ${
      productFromDb?.materialName ?? fallback!.material
    }`,
    sku: productFromDb?.id ?? fallback!.id,
    brand: { '@type': 'Organization', name: 'SAZZE' },
    offers: {
      '@type': 'Offer',
      price: productFromDb
        ? Math.round(productFromDb.priceInCents / 100)
        : fallback!.price,
      priceCurrency: 'SEK',
      availability: 'https://schema.org/InStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {productFromDb ? (
        <ProductDetailClient product={productFromDb} />
      ) : (
        <ProductDetailClient
          product={{
            id: fallback!.id,
            slug: fallback!.id,
            name: fallback!.name,
            description: null,
            categoryId: fallback!.category,
            categoryName: fallback!.category,
            materialId: fallback!.material,
            materialName: fallback!.material,
            priceInCents: Math.round(fallback!.price * 100),
            priceClass: fallback!.priceClass,
            season: fallback!.season,
            canonicalImage: fallback!.image,
            attributes: null,
            variants: [
              {
                id: `${fallback!.id}-default`,
                sku: fallback!.id,
                colorId: null,
                colorName: fallback!.color,
                colorHex: null,
                images: [fallback!.image],
                priceInCents: Math.round(fallback!.price * 100),
                stock: 10,
                active: true,
              },
            ],
          }}
        />
      )}
    </>
  );
}
