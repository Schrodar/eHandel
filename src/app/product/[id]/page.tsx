import { notFound } from 'next/navigation';
import ProductDetailClient from '@/components/ProductDetailClient';
import { SAMPLE_WARDROBE } from '@/lib/wardrobeApi';
import { getWardrobeProductByIdOrSlug } from '@/lib/productService';
import type { Metadata } from 'next';

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // `params` can be a Promise in some Next.js runtimes — await to unwrap
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolvedParams = (await (params as any)) as { id: string };
  const productFromDb = await getWardrobeProductByIdOrSlug(resolvedParams.id);
  const product =
    productFromDb ?? SAMPLE_WARDROBE.find((p) => p.id === resolvedParams.id);
  if (!product) return { title: 'Product not found' };

  const siteUrl =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://example.com';
  const canonical = new URL(`/product/${product.id}`, siteUrl).toString();
  const imageUrl = product.image.startsWith('http')
    ? product.image
    : new URL(product.image, siteUrl).toString();

  return {
    title: `${product.name} — SAZZE`,
    description: `${product.name}. ${product.material}. Price class: ${product.priceClass}.`,
    openGraph: {
      title: `${product.name} — SAZZE`,
      description: `${product.name}. ${product.material}.`,
      url: canonical,
      images: [
        {
          url: imageUrl,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — SAZZE`,
      description: `${product.name}. ${product.material}.`,
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
  const productFromDb = await getWardrobeProductByIdOrSlug(resolvedParams.id);
  const product =
    productFromDb ?? SAMPLE_WARDROBE.find((p) => p.id === resolvedParams.id);
  if (!product) return notFound();

  const jsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: [product.image],
    description: `${product.name} — ${product.material}`,
    sku: product.id,
    brand: { '@type': 'Organization', name: 'SAZZE' },
    offers: {
      '@type': 'Offer',
      price: product.price,
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
      <ProductDetailClient product={product} />
    </>
  );
}
