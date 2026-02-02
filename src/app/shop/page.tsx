import Wardrobe from '@/components/Wardrobe';
import { ShopPrefetchTopProducts } from '@/components/ShopPrefetchTopProducts';
import { SAMPLE_WARDROBE } from '@/lib/wardrobeApi';
import { getAllWardrobeProductsFromDb } from '@/lib/productService';
import Link from 'next/link';

export const metadata = {
  title: 'Shop — SAZZE',
  description:
    'Browse our wardrobe collection. Filter by category, color, fit, material and season.',
};

const TAKE = 12;

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getPageNumber(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value ?? '1');
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export default async function ShopPage({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {};
  const page = getPageNumber(resolved.page);
  const skip = (page - 1) * TAKE;

  const productsFromDb = await getAllWardrobeProductsFromDb();
  const allProducts = productsFromDb.length ? productsFromDb : SAMPLE_WARDROBE;
  const total = allProducts.length;
  const products = allProducts.slice(skip, skip + TAKE);

  const first3 = products.slice(0, 3).map((p) => ({
    // WardrobeProduct doesn’t have slug; product route accepts id as well.
    slug: p.id,
    imageUrl: p.image,
  }));

  const hasPrev = page > 1;
  const hasNext = skip + TAKE < total;

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <h1 className="text-2xl font-serif mb-4">Shop</h1>

        {/* Client island: prefetch top products (routes + images), once per session */}
        <ShopPrefetchTopProducts products={first3} />

        <Wardrobe products={products} />

        <div className="mt-8 flex items-center justify-between text-sm">
          <div className="text-slate-600">
            Page {page} • Showing {products.length} of {total}
          </div>

          <div className="flex items-center gap-3">
            {hasPrev ? (
              <Link
                href={`/shop?page=${page - 1}`}
                className="btn-ghost"
                prefetch={false}
              >
                Prev
              </Link>
            ) : (
              <span className="opacity-40 btn-ghost select-none">Prev</span>
            )}

            {hasNext ? (
              <Link
                href={`/shop?page=${page + 1}`}
                className="btn-ghost"
                prefetch={false}
              >
                Next
              </Link>
            ) : (
              <span className="opacity-40 btn-ghost select-none">Next</span>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
