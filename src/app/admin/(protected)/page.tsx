import { getAdminDashboardData } from '@/lib/admin/dashboardService';
import Link from 'next/link';

export const metadata = {
  title: 'Admin – Dashboard',
};

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  let kpis;
  let dbError: string | null = null;
  
  try {
    kpis = await getAdminDashboardData();
  } catch (err: unknown) {
    // If DATABASE_URL is placeholder or invalid, show setup UI instead of crashing
    dbError = err instanceof Error ? err.message : 'Database connection failed';
    kpis = null;
  }
  
  if (!kpis) {
    return (
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-serif">Admin – Dashboard</h1>
          <p className="text-sm text-slate-600">Database setup required</p>
        </header>
        
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="font-semibold text-amber-900">Database Configuration Required</h2>
          <p className="mt-2 text-sm text-amber-800">
            {dbError}
          </p>
          <p className="mt-2 text-sm text-amber-700">
            Please update your <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> in <code className="rounded bg-amber-100 px-1">.env</code> with valid Supabase credentials.
          </p>
          <ul className="mt-3 list-inside list-disc text-sm text-amber-700">
            <li>Go to your Supabase project → Settings → Database</li>
            <li>Copy the connection string (URI)</li>
            <li>Replace <code className="rounded bg-amber-100 px-1">YOUR_PASSWORD</code> with your actual database password</li>
            <li>Run <code className="rounded bg-amber-100 px-1">npm run dev</code> again</li>
          </ul>
        </div>
      </div>
    );
  }
  
  const {
    publishedCount,
    draftCount,
    lowStockCount,
    lowStockProducts,
    issues,
  } = kpis;

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
          prefetch={false}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Produkter</div>
          <div className="mt-1 text-xs text-slate-600">
            Hantera produkter och varianter
          </div>
        </Link>
        <Link
          href="/admin/categories"
          prefetch={false}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Kategorier</div>
          <div className="mt-1 text-xs text-slate-600">Globala kategorier</div>
        </Link>
        <Link
          href="/admin/materials"
          prefetch={false}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-slate-300"
        >
          <div className="font-medium">Material</div>
          <div className="mt-1 text-xs text-slate-600">Globala material</div>
        </Link>
        <Link
          href="/admin/colors"
          prefetch={false}
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
            prefetch={false}
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
                  prefetch={false}
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
                    prefetch={false}
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
