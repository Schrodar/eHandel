import Link from 'next/link';
import { listIncompleteOrders } from '@/lib/orders/queries';
import { formatPaymentStatus, formatCheckoutStatus } from '@/lib/orders/formatters';
import { CompareButton } from './CompareButton';

export const metadata = {
  title: 'Admin – Ej slutförda köp',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function toIntParam(value: string | string[] | undefined, fallback: number) {
  const s = toStringParam(value);
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseLocalDate(dateString: string, endOfDay: boolean): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return undefined;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = endOfDay
    ? new Date(year, monthIndex, day, 23, 59, 59, 999)
    : new Date(year, monthIndex, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
    return undefined;
  }
  return date;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}

function buildPageHref(params: SearchParams, page: number): { href: string } {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== '' && key !== 'page') search.set(key, v);
  });
  search.set('page', String(page));
  return { href: `/admin/orders/incomplete?${search.toString()}` };
}

export default async function IncompleteOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const query = toStringParam(sp.query);
  const fromParam = toStringParam(sp.from);
  const toParam = toStringParam(sp.to);
  const page = toIntParam(sp.page, 1);

  let from = fromParam ? parseLocalDate(fromParam, false) : undefined;
  let to = toParam ? parseLocalDate(toParam, true) : undefined;
  if (from && to && from > to) [from, to] = [to, from];

  const { orders, total, pageSize } = await listIncompleteOrders({ query, from, to, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">Ej slutförda köp</h1>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Analysverktyg
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {total} order{total !== 1 ? 'ar' : ''} som aldrig slutfördes
          </p>
        </div>
        <Link
          href="/admin/orders"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Hanterbara ordrar
        </Link>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 space-y-1">
        <p>
          <strong>Analysverktyg —</strong> Dessa ordrar påverkar inte betalflödet.
          Ingenting ändras när du klickar Jämför.
        </p>
        <p>
          Klicka <strong>Jämför</strong> för att se om kunden senare genomförde ett köp
          (samma e-post, inom 24 timmar). Möjliga kandidater för uppföljning är ordrar
          utan matchande lyckad order.
        </p>
      </div>

      {/* Filter form */}
      <form
        method="get"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-4"
      >
        <input
          type="search"
          name="query"
          defaultValue={query ?? ''}
          placeholder="Sök ordernr / namn / email"
          className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="from"
          defaultValue={fromParam ?? ''}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={toParam ?? ''}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Filtrera
        </button>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Skapad</th>
              <th className="px-4 py-3">Ordernr</th>
              <th className="px-4 py-3">Kund</th>
              <th className="px-4 py-3">Mobil</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Betalning</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Jämför</th>
              <th className="px-4 py-3">Resultat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => {
              const hasContact =
                !!order.customerName && !!order.customerEmail && !!order.customerPhone;

              return (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold text-slate-900 hover:underline text-xs"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 text-xs">{order.customerName || '—'}</div>
                    <div className="text-slate-500 text-xs">{order.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {order.customerPhone || (
                      <span className="text-slate-400 italic">saknas</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {formatCheckoutStatus(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {formatPaymentStatus(order.paymentStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900 text-xs">
                    {formatMoney(order.total, order.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {hasContact ? (
                      <CompareButton orderId={order.id} />
                    ) : (
                      <span className="text-xs text-slate-400 italic">saknas</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {/* Populated by CompareButton client component */}
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  Inga ej slutförda köp matchar filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-500">Sida {page} av {totalPages}</div>
        <div className="flex gap-2">
          <Link
            {...buildPageHref(sp, Math.max(1, page - 1))}
            className={`rounded-lg border px-3 py-1.5 ${
              page <= 1
                ? 'pointer-events-none border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            Föregående
          </Link>
          <Link
            {...buildPageHref(sp, Math.min(totalPages, page + 1))}
            className={`rounded-lg border px-3 py-1.5 ${
              page >= totalPages
                ? 'pointer-events-none border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            Nästa
          </Link>
        </div>
      </div>
    </div>
  );
}
