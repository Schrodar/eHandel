import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import Link from 'next/link';
import { deleteProduct } from './actions';

export const metadata = {
  title: 'Admin – Products',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

type ProductRow = Prisma.ProductGetPayload<{
  include: {
    category: true;
    material: true;
    variants: true;
    _count: { select: { variants: true } };
  };
}>;

function MobileProductListAccordion({
  products,
}: {
  products: ProductRow[];
}) {
  return (
    <div className="space-y-3 md:hidden">
      {products.map((p) => {
        const activeVariants = p.variants.filter((v) => v.active);
        const activeStocks = activeVariants.map((v) => (typeof v.stock === 'number' ? v.stock : 0));
        const minActiveStock = activeStocks.length > 0 ? Math.min(...activeStocks) : null;
        const hasProblem =
          (p.published && !p.canonicalImage) ||
          (p.published && activeVariants.length === 0) ||
          activeVariants.some((v) => !v.images && !p.canonicalImage);

        return (
          <details
            key={p.id}
            className="group rounded-xl border border-slate-200 bg-white"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden [&::marker]:content-none">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {p.name}
                  </div>
                  <span
                    className={
                      p.published
                        ? 'shrink-0 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                        : 'shrink-0 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'
                    }
                  >
                    {p.published ? 'Published' : 'Draft'}
                  </span>
                  {minActiveStock != null && minActiveStock < 3 && (
                    <span className="shrink-0 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Low stock
                    </span>
                  )}
                  {hasProblem && (
                    <span className="shrink-0 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Problem
                    </span>
                  )}
                </div>
              </div>
              <svg
                viewBox="0 0 20 20"
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
              >
                <path
                  fill="currentColor"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                />
              </svg>
            </summary>

            <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-700">
              <dl className="grid grid-cols-1 gap-3">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Slug
                  </dt>
                  <dd className="mt-0.5 break-words font-mono text-[11px] text-slate-700">
                    {p.slug}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    ID
                  </dt>
                  <dd className="mt-0.5 break-words font-mono text-[11px] text-slate-700">
                    {p.id}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Pris
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-slate-900">
                        {p.priceInCents != null ? `${Math.round(p.priceInCents / 100)} kr` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Varianter
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-slate-900">
                      {activeVariants.length}/{p._count.variants}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Uppdaterad
                  </dt>
                  <dd className="mt-0.5 text-slate-600">—</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-2">
                <Link
                  href={`/admin/products/${p.id}`}
                  className="w-full rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                >
                  Edit
                </Link>
                <Link
                  href={`/product/${p.slug}`}
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Preview
                </Link>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const q = toStringParam(searchParams?.q) ?? '';
  const publishedFilter = toStringParam(searchParams?.published) ?? 'all';
  const categoryId = toStringParam(searchParams?.categoryId) ?? '';
  const materialId = toStringParam(searchParams?.materialId) ?? '';
  const priceClass = toStringParam(searchParams?.priceClass) ?? '';
  const season = toStringParam(searchParams?.season) ?? '';
  const sort = toStringParam(searchParams?.sort) ?? 'name-asc';

  const where: Prisma.ProductWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (publishedFilter === 'published') {
    where.published = true;
  } else if (publishedFilter === 'draft') {
    where.published = false;
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (materialId) {
    where.materialId = materialId;
  }
  if (priceClass) {
    where.priceClass = priceClass;
  }
  if (season) {
    where.season = season;
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { name: 'asc' };
  if (sort === 'name-desc') {
    orderBy = { name: 'desc' };
  } else if (sort === 'price-asc') {
    orderBy = { priceInCents: 'asc' };
  } else if (sort === 'price-desc') {
    orderBy = { priceInCents: 'desc' };
  }
  // "Senast ändrad" kräver timestamps i modellen och kan läggas till senare

  const [products, categories, materials] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        material: true,
        variants: true,
        _count: { select: { variants: true } },
      },
      orderBy,
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.material.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-serif">Produkter</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sök, filtrera och hantera produkter och varianter.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/shop"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Förhandsgranska shop
          </Link>
          <Link
            href="/admin/products/new"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Skapa produkt
          </Link>
        </div>
      </header>

  <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Sök
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Sök på namn, slug eller id"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Published
          </label>
          <select
            name="published"
            defaultValue={publishedFilter}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="all">Alla</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Sortering
          </label>
          <select
            name="sort"
            defaultValue={sort}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="name-asc">Namn A–Ö</option>
            <option value="name-desc">Namn Ö–A</option>
            <option value="price-asc">Pris lågt → högt</option>
            <option value="price-desc">Pris högt → lågt</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Kategori
          </label>
          <select
            name="categoryId"
            defaultValue={categoryId}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="">Alla</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Material
          </label>
          <select
            name="materialId"
            defaultValue={materialId}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="">Alla</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            PriceClass
          </label>
          <input
            type="text"
            name="priceClass"
            defaultValue={priceClass}
            placeholder="t.ex. standard/premium"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Season
          </label>
          <input
            type="text"
            name="season"
            defaultValue={season}
            placeholder="t.ex. ss24/aw24/all"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
        <div className="flex items-end justify-end gap-2 md:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Filtrera
          </button>
        </div>
      </form>

      {products.length === 0 ? (
        <p className="text-sm text-slate-600">
          Inga produkter matchar filtren.
        </p>
      ) : (
        <>
          <MobileProductListAccordion products={products} />
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white text-sm md:block">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Thumbnail</th>
                <th className="px-3 py-2">Namn</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2 text-right">Baspris (kr)</th>
                <th className="px-3 py-2 text-center">
                  Varianter (aktiva/total)
                </th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Problem</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const activeVariants = p.variants.filter((v) => v.active);
                const activeStocks = activeVariants.map((v) =>
                  typeof v.stock === 'number' ? v.stock : 0,
                );
                const minActiveStock =
                  activeStocks.length > 0 ? Math.min(...activeStocks) : null;
                const hasProblem =
                  (p.published && !p.canonicalImage) ||
                  (p.published && activeVariants.length === 0) ||
                  activeVariants.some((v) => !v.images && !p.canonicalImage);

                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-2">
                      {p.canonicalImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.canonicalImage}
                          alt={p.name}
                          className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-400">
                          Ingen bild
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-slate-600">
                      {p.slug}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {p.category?.name ?? '–'}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-600">
                      {p.material?.name ?? '–'}
                    </td>
                    <td className="px-3 py-2 text-right text-sm tabular-nums">
                      {p.priceInCents != null ? Math.round(p.priceInCents / 100) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-slate-700">
                      {activeVariants.length}/{p._count.variants}
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      <span
                        className={
                          p.published
                            ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                            : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'
                        }
                      >
                        {p.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-xs">
                      {hasProblem && (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Problem
                        </span>
                      )}
                      {minActiveStock != null && minActiveStock < 3 && (
                        <span className="ml-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          Low stock
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/product/${p.slug}`}
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Preview
                        </Link>
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
