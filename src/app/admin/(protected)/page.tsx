import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Prisma } from '@prisma/client';

export const metadata = {
  title: 'Admin – Dashboard',
};

export const dynamic = 'force-dynamic';

async function getKpis() {
  const LOW_STOCK_THRESHOLD = 3;
  const LIMIT = 50;

  const [
    publishedCount,
    draftCount,
    lowStockVariantCount,
    activeVariantAgg,
    publishedNoActiveVariants,
    negativeStockVariants,
    negativePriceVariants,
    emptySkuVariants,
  ] = await prisma.$transaction([
    prisma.product.count({ where: { published: true } }),
    prisma.product.count({ where: { published: false } }),
    prisma.productVariant.count({
      where: { active: true, stock: { lt: LOW_STOCK_THRESHOLD } },
    }),
    prisma.productVariant.groupBy({
      by: ['productId'],
      where: { active: true },
      orderBy: { productId: 'asc' },
      _count: { _all: true },
      _min: { stock: true },
    }),
    prisma.product.findMany({
      where: { published: true, variants: { none: { active: true } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: LIMIT,
    }),
    prisma.productVariant.findMany({
      where: { stock: { lt: 0 } },
      select: {
        id: true,
        sku: true,
        product: { select: { id: true, name: true } },
      },
      take: LIMIT,
    }),
    prisma.productVariant.findMany({
      where: { priceInCents: { lt: 0 } },
      select: {
        id: true,
        sku: true,
        product: { select: { id: true, name: true } },
      },
      take: LIMIT,
    }),
    prisma.productVariant.findMany({
      where: { sku: '' },
      select: {
        id: true,
        sku: true,
        product: { select: { id: true, name: true } },
      },
      take: LIMIT,
    }),
  ]);

  const lowStockAgg = activeVariantAgg
    .map((row) => ({
      productId: row.productId,
      minStock: row._min?.stock ?? null,
    }))
    .filter(
      (row) => (row.minStock ?? Number.POSITIVE_INFINITY) < LOW_STOCK_THRESHOLD,
    )
    .map((row) => ({
      productId: row.productId,
      minStock: row.minStock ?? 0,
    }));

  const lowStockProductIds = lowStockAgg.map((r) => r.productId);
  const lowStockProductNames =
    lowStockProductIds.length === 0
      ? []
      : await prisma.product.findMany({
          where: { id: { in: lowStockProductIds } },
          select: { id: true, name: true },
        });
  const nameById = new Map(
    lowStockProductNames.map((p) => [p.id, p.name] as const),
  );

  const lowStockProducts: {
    productId: string;
    productName: string;
    minStock: number;
  }[] = lowStockAgg
    .map((row) => ({
      productId: row.productId,
      productName: nameById.get(row.productId) ?? row.productId,
      minStock: row.minStock,
    }))
    .slice(0, LIMIT);

  const issues: {
    productId: string;
    productName: string;
    type: string;
  }[] = [];

  for (const p of publishedNoActiveVariants) {
    issues.push({
      productId: p.id,
      productName: p.name,
      type: 'Published men har 0 aktiva varianter',
    });
  }

  for (const v of negativeStockVariants) {
    issues.push({
      productId: v.product.id,
      productName: v.product.name,
      type: 'Variant har stock < 0',
    });
  }

  for (const v of negativePriceVariants) {
    issues.push({
      productId: v.product.id,
      productName: v.product.name,
      type: 'Variant har negativt price override',
    });
  }

  for (const v of emptySkuVariants) {
    issues.push({
      productId: v.product.id,
      productName: v.product.name,
      type: 'Variant har tom SKU',
    });
  }

  return {
    publishedCount,
    draftCount,
    lowStockCount: lowStockProducts.length,
    lowStockVariantCount,
    lowStockProducts,
    issues: issues.slice(0, LIMIT),
  };
}

export default async function AdminDashboardPage() {
  const {
    publishedCount,
    draftCount,
    lowStockCount,
    lowStockProducts,
    issues,
  } = await getKpis();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif">Admin – Dashboard</h1>
        <p className="text-sm text-slate-600">
          Snabböversikt över produkter, status och eventuella problem att
          åtgärda.
        </p>
      </header>

      <section
        aria-label="Snabblänkar"
        className="grid gap-3 text-sm sm:grid-cols-4"
      >
        <Link
          href="/admin/products"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Produkter</div>
          <div className="mt-1 text-xs text-slate-600">
            Hantera produkter och varianter
          </div>
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Kategorier</div>
          <div className="mt-1 text-xs text-slate-600">Globala kategorier</div>
        </Link>
        <Link
          href="/admin/materials"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Material</div>
          <div className="mt-1 text-xs text-slate-600">Globala material</div>
        </Link>
        <Link
          href="/admin/colors"
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Färger</div>
          <div className="mt-1 text-xs text-slate-600">Färgregister</div>
        </Link>
      </section>

      <section aria-label="Översikt" className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Published
          </div>
          <div className="mt-2 text-2xl font-semibold text-emerald-900">
            {publishedCount}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
            Draft
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {draftCount}
          </div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Low stock produkter (min aktiv variant &lt; 3)
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-900">
            {lowStockCount}
          </div>
        </div>
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Problem
          </div>
          <div className="mt-2 text-2xl font-semibold text-rose-900">
            {issues.length}
          </div>
        </div>
      </section>

      <section aria-label="Att åtgärda" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Att åtgärda</h2>
          <Link
            href="/admin/products"
            className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            Gå till produkthantering
          </Link>
        </div>

        {issues.length === 0 ? (
          <p className="text-xs text-slate-600">
            Inga uppenbara problem hittades i produkter eller varianter.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            {issues.map((issue, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <div className="text-xs font-medium text-slate-900">
                    {issue.productName}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {issue.type}
                  </div>
                </div>
                <Link
                  href={`/admin/products/${issue.productId}`}
                  className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                >
                  Öppna
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Låg lagernivå" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Låg lagernivå
          </h2>
          <div className="text-xs text-slate-500">
            Tröskel: min aktiv variant &lt; 3
          </div>
        </div>

        {lowStockProducts.length === 0 ? (
          <p className="text-xs text-slate-600">
            Inga produkter har låg lagernivå.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            {lowStockProducts
              .slice()
              .sort((a, b) => a.minStock - b.minStock)
              .map((p) => (
                <li
                  key={p.productId}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="text-xs font-medium text-slate-900">
                      {p.productName}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">
                      Min stock (aktiva varianter): {p.minStock}
                    </div>
                  </div>
                  <Link
                    href={`/admin/products/${p.productId}?tab=variants`}
                    className="text-xs font-medium text-slate-700 underline-offset-2 hover:underline"
                  >
                    Öppna
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
