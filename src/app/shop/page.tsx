import { Suspense } from 'react';
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

/*  Skeleton: same grid + card classes as real output  */
function ShopGridSkeleton() {
  return (
    <div className="wardrobe-grid" aria-busy="true" aria-label="Laddar produkter">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card animate-pulse">
          <div
            className="imgWrap"
            style={{ background: 'var(--panel)', border: '1px solid rgba(0,0,0,0.04)' }}
          />
          <div className="meta" style={{ marginTop: 10 }}>
            <div
              style={{
                height: 16,
                width: '55%',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.08)',
              }}
            />
            <div
              style={{
                height: 14,
                width: '20%',
                borderRadius: 6,
                background: 'rgba(0,0,0,0.06)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/*  Async component: fetches data + renders Wardrobe + pagination  */
async function ShopProductList({ page }: { page: number }) {
  const skip = (page - 1) * TAKE;

  const productsFromDb = await getAllWardrobeProductsFromDb();
  const allProducts = productsFromDb.length ? productsFromDb : SAMPLE_WARDROBE;
  const total = allProducts.length;
  const products = allProducts.slice(skip, skip + TAKE);

  const first3 = products.slice(0, 3).map((p) => ({
    // WardrobeProduct does not have slug; product route also accepts id.
    slug: p.id,
    imageUrl: p.image,
  }));

  const hasPrev = page > 1;
  const hasNext = skip + TAKE < total;

  return (
    <>
      {/* Client island: prefetch top product routes + images, once per session */}
      <ShopPrefetchTopProducts products={first3} />

      <Wardrobe products={products} />

      <div className="mt-8 flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Page {page} • Showing {products.length} of {total}
        </div>

        <div className="flex items-center gap-3">
          {hasPrev ? (
            <Link href={`/shop?page=${page - 1}`} className="btn-ghost" prefetch={false}>
              Prev
            </Link>
          ) : (
            <span className="opacity-40 btn-ghost select-none">Prev</span>
          )}

          {hasNext ? (
            <Link href={`/shop?page=${page + 1}`} className="btn-ghost" prefetch={false}>
              Next
            </Link>
          ) : (
            <span className="opacity-40 btn-ghost select-none">Next</span>
          )}
        </div>
      </div>
    </>
  );
}

/*  Page  */
export default async function ShopPage({ searchParams }: Props) {
  const resolved = (await searchParams) ?? {};
  const page = getPageNumber(resolved.page);

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <h1 className="text-2xl font-serif mb-4">Shop</h1>

        <Suspense fallback={<ShopGridSkeleton />}>
          <ShopProductList page={page} />
        </Suspense>
      </div>
    </main>
  );
}
