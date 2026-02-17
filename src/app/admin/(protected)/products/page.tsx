import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { deleteProduct } from './actions';
import AdminForm from '@/components/admin/AdminForm';
import { getProductCardImage } from '@/lib/productCardImage';

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

function toIntParam(
  value: string | string[] | undefined,
  fallback: number,
): number {
  const s = toStringParam(value);
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type ProductRow = Prisma.ProductGetPayload<{
  select: {
    id: true;
    name: true;
    slug: true;
    published: true;
    defaultVariantId: true;
    category: { select: { id: true; name: true } };
    material: { select: { id: true; name: true } };
    _count: { select: { variants: true } };
    defaultVariant: {
      select: { variantImages: { include: { asset: true } } };
    };
    variants: {
      select: {
        variantImages: {
          include: { asset: true };
          orderBy: { sortOrder: 'asc' };
        };
      };
    };
  };
}>;

type VariantStats = {
  activeCount: number;
  minActiveStock: number | null;
};

function MobileProductListAccordion({
  products,
  statsById,
}: {
  products: ProductRow[];
  statsById: Record<string, VariantStats | undefined>;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {products.map((p) => {
        const stats = statsById[p.id];
        const activeCount = stats?.activeCount ?? 0;
        const minActiveStock = stats?.minActiveStock ?? null;
        const hasProblem = p.published && activeCount === 0;

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
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Varianter
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium tabular-nums text-slate-900">
                      {activeCount}/{p._count.variants}
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
                <AdminForm
                  action={deleteProduct}
                  toastMessage={undefined}
                  pendingMessage="Tar bort…"
                  showOverlay
                >
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Delete
                  </button>
                </AdminForm>
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
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = toStringParam(resolvedSearchParams?.q) ?? '';
  const publishedFilter =
    toStringParam(resolvedSearchParams?.published) ?? 'all';
  const categoryId = toStringParam(resolvedSearchParams?.categoryId) ?? '';
  const materialId = toStringParam(resolvedSearchParams?.materialId) ?? '';
  const priceClass = toStringParam(resolvedSearchParams?.priceClass) ?? '';
  const season = toStringParam(resolvedSearchParams?.season) ?? '';
  const sort = toStringParam(resolvedSearchParams?.sort) ?? 'name-asc';

  const requestedPage = Math.max(1, toIntParam(resolvedSearchParams?.page, 1));
  const pageSize = clamp(
    toIntParam(resolvedSearchParams?.pageSize, 25),
    10,
    100,
  );

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
  }
  // "Senast ändrad" kräver timestamps i modellen och kan läggas till senare

  const {
    products,
    totalCount,
    totalPages,
    effectivePage,
    skip,
    categories,
    materials,
  } = await prisma.$transaction(async (tx) => {
    const totalCount = await tx.product.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const effectivePage = clamp(requestedPage, 1, totalPages);
    const skip = (effectivePage - 1) * pageSize;

    const products = await tx.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        published: true,
        defaultVariantId: true,
        category: { select: { id: true, name: true } },
        material: { select: { id: true, name: true } },
        _count: { select: { variants: true } },
        defaultVariant: {
          select: { variantImages: { include: { asset: true } } },
        },
        variants: {
          select: {
            variantImages: {
              include: { asset: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    });

    const categories = await tx.category.findMany({ orderBy: { name: 'asc' } });
    const materials = await tx.material.findMany({ orderBy: { name: 'asc' } });

    return {
      products,
      totalCount,
      totalPages,
      effectivePage,
      skip,
      categories,
      materials,
    };
  });

  const productIds = products.map((p) => p.id);

  const statsById: Record<string, VariantStats | undefined> =
    Object.create(null);

  if (productIds.length > 0) {
    const activeAgg = await prisma.productVariant.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        active: true,
      },
      orderBy: { productId: 'asc' },
      _count: { productId: true },
      _min: { stock: true },
    });

    for (const row of activeAgg) {
      const activeCount =
        row._count &&
        typeof row._count === 'object' &&
        'productId' in row._count &&
        typeof (row._count as { productId?: unknown }).productId === 'number'
          ? ((row._count as { productId: number }).productId ?? 0)
          : 0;

      statsById[row.productId] = {
        activeCount,
        minActiveStock: row._min?.stock ?? null,
      };
    }
  }

  const from = totalCount === 0 ? 0 : skip + 1;
  const to = Math.min(totalCount, skip + products.length);

  const makeHref = (nextPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (publishedFilter && publishedFilter !== 'all')
      sp.set('published', publishedFilter);
    if (categoryId) sp.set('categoryId', categoryId);
    if (materialId) sp.set('materialId', materialId);
    if (priceClass) sp.set('priceClass', priceClass);
    if (season) sp.set('season', season);
    if (sort) sp.set('sort', sort);
    sp.set('page', String(nextPage));
    sp.set('pageSize', String(pageSize));
    const qs = sp.toString();
    return qs ? `/admin/products?${qs}` : '/admin/products';
  };

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
        <input type="hidden" name="page" value="1" />
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
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
            Per sida
          </label>
          <select
            name="pageSize"
            defaultValue={String(pageSize)}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={String(n)}>
                {n}
              </option>
            ))}
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
          <MobileProductListAccordion
            products={products}
            statsById={statsById}
          />
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white text-sm md:block">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Image</th>
                  <th className="px-3 py-2">Namn</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Kategori</th>
                  <th className="px-3 py-2">Material</th>
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
                  const stats = statsById[p.id];
                  const activeCount = stats?.activeCount ?? 0;
                  const minActiveStock = stats?.minActiveStock ?? null;
                  const hasProblem = p.published && activeCount === 0;
                  const imageUrl = getProductCardImage(p as any);

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-3 py-2">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={p.name}
                            className="h-8 w-8 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-slate-200 text-[9px] text-slate-400">
                            No img
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
                      <td className="px-3 py-2 text-center text-xs text-slate-700">
                        {activeCount}/{p._count.variants}
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              Visar {from}–{to} av {totalCount} (sida {effectivePage}/
              {totalPages})
            </div>
            <div className="flex items-center justify-end gap-2">
              {effectivePage > 1 ? (
                <Link
                  href={makeHref(effectivePage - 1)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Föregående
                </Link>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400">
                  Föregående
                </span>
              )}
              {effectivePage < totalPages ? (
                <Link
                  href={makeHref(effectivePage + 1)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Nästa
                </Link>
              ) : (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400">
                  Nästa
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
