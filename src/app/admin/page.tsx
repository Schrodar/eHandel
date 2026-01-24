import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const metadata = {
  title: 'Admin – Dashboard',
};

async function getKpis() {
  const [publishedCount, draftCount, lowStockCount, productsWithRelations] =
    await Promise.all([
      prisma.product.count({ where: { published: true } }),
      prisma.product.count({ where: { published: false } }),
      prisma.productVariant.count({
        where: { active: true, stock: { lt: 3 } },
      }),
      prisma.product.findMany({
        include: {
          variants: true,
        },
      }),
    ]);

  const issues: {
    productId: string;
    productName: string;
    type: string;
  }[] = [];

  for (const product of productsWithRelations) {
    const activeVariants = product.variants.filter((v) => v.active);

    if (product.published && !product.canonicalImage) {
      issues.push({
        productId: product.id,
        productName: product.name,
        type: 'Published men saknar canonical image',
      });
    }

    if (product.published && activeVariants.length === 0) {
      issues.push({
        productId: product.id,
        productName: product.name,
        type: 'Published men har 0 aktiva varianter',
      });
    }

    for (const variant of product.variants) {
      if (!variant.sku) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: 'Variant saknar SKU',
        });
      }
      if (variant.stock < 0) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: 'Variant har stock < 0',
        });
      }
      if (
        variant.priceInCents !== null &&
        variant.priceInCents !== undefined &&
        variant.priceInCents < 0
      ) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: 'Variant har negativt price override',
        });
      }
      if (variant.active && !variant.images) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: 'Aktiv variant saknar bilder',
        });
      }
    }
  }

  return { publishedCount, draftCount, lowStockCount, issues };
}

export default async function AdminDashboardPage() {
  const { publishedCount, draftCount, lowStockCount, issues } = await getKpis();

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
            Low stock (aktiva varianter &lt; 3 i lager)
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
    </div>
  );
}
