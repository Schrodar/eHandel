import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';

export const metadata = {
  title: 'Admin – Rabatter',
};

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: 'Hela sortimentet',
  CATEGORY: 'Kategori',
  PRODUCT: 'Produkt',
  VARIANT: 'Variant',
};

const TYPE_LABELS: Record<string, string> = {
  PERCENT: '%',
  AMOUNT: 'kr',
  FREE_SHIPPING: 'Fri frakt',
};

function formatValue(type: string, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  if (type === 'AMOUNT') return `${(value / 100).toFixed(0)} kr`;
  return 'Fri frakt';
}

export default async function AdminDiscountsPage() {
  await requireAdminSession();

  const drives = await prisma.discountDrive.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { codes: true } },
      codes: { select: { usageType: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Rabattkampanjer</h1>
        <Link
          href="/admin/discounts/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          + Ny kampanj
        </Link>
      </div>

      {drives.length === 0 ? (
        <p className="text-sm text-slate-500">Inga kampanjer ännu.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Namn</th>
                <th className="px-4 py-3 text-left">Rabatt</th>
                <th className="px-4 py-3 text-left">Scope</th>
                <th className="px-4 py-3 text-right">Koder</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drives.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatValue(d.discountType, d.value)}
                    {d.minOrderValue
                      ? ` (min ${(d.minOrderValue / 100).toFixed(0)} kr)`
                      : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {SCOPE_LABELS[d.scopeType] ?? d.scopeType}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">
                    {d.codes.some((c) => c.usageType === 'UNLIMITED') ? '∞' : d._count.codes}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={[
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        d.active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {d.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/discounts/${d.id}`}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      Hantera →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
