import Link from 'next/link';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import { listOrders } from '@/lib/orders/queries';
import { formatPaymentStatus, formatOrderStatus } from '@/lib/orders/formatters';
import AdminForm from '@/components/admin/AdminForm';
import { createTestOrder } from './actions';

export const metadata = {
  title: 'Admin – Orders',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function toIntParam(value: string | string[] | undefined, fallback: number) {
  const s = toStringParam(value);
  if (!s) return fallback;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
}

function isPaymentStatus(value: string | undefined): value is PaymentStatus {
  return (
    value != null && (Object.values(PaymentStatus) as string[]).includes(value)
  );
}

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return (
    value != null && (Object.values(OrderStatus) as string[]).includes(value)
  );
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
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function getNextAction(order: {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}) {
  if (order.orderStatus === OrderStatus.NEW) return 'Starta plock';
  if (order.orderStatus === OrderStatus.READY_TO_PICK) return 'Starta plock';
  if (order.orderStatus === OrderStatus.PICKING) return 'Plock klart';
  if (order.orderStatus === OrderStatus.PACKED) return 'Skicka';
  if (
    order.orderStatus === OrderStatus.SHIPPED &&
    order.paymentStatus === PaymentStatus.AUTHORIZED
  ) {
    return 'Capture';
  }
  if (order.orderStatus === OrderStatus.SHIPPED) return 'Avvakta capture';
  if (order.orderStatus === OrderStatus.CANCELLED) return 'Avbruten';
  if (order.orderStatus === OrderStatus.COMPLETED) return 'Klar';
  return '—';
}

function parseLocalDate(
  dateString: string,
  endOfDay: boolean,
): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return undefined;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = endOfDay
    ? new Date(year, monthIndex, day, 23, 59, 59, 999)
    : new Date(year, monthIndex, day, 0, 0, 0, 0);

  // Kontrollera att datumet inte "rullade över"
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}


function buildPageHref(params: SearchParams, page: number): { href: string } {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (v != null && v !== '' && key !== 'page') search.set(key, v);
  });
  search.set('page', String(page));
  return { href: `/admin/orders?${search.toString()}` };
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const paymentStatusParam = toStringParam(searchParams.paymentStatus);
  const orderStatusParam = toStringParam(searchParams.orderStatus);
  const query = toStringParam(searchParams.query);
  const fromParam = toStringParam(searchParams.from);
  const toParam = toStringParam(searchParams.to);

  const paymentStatus = isPaymentStatus(paymentStatusParam)
    ? paymentStatusParam
    : undefined;

  const orderStatus = isOrderStatus(orderStatusParam)
    ? orderStatusParam
    : undefined;

 let from = fromParam ? parseLocalDate(fromParam, false) : undefined;
let to = toParam ? parseLocalDate(toParam, true) : undefined;

if (from && to && from > to) {
  [from, to] = [to, from];
}


  const page = toIntParam(searchParams.page, 1);

const { orders, total, pageSize } = await listOrders({
  paymentStatus,
  orderStatus,
  query,
  from,
  to,
  page,
});


  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ordrar</h1>
          <p className="text-sm text-slate-500">{total} ordrar totalt</p>
        </div>
        <AdminForm
          action={createTestOrder}
          toastMessage="Testorder skapad"
          pendingMessage="Skapar testorder..."
        >
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Skapa testorder
          </button>
        </AdminForm>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6"
      >
        <input
          type="search"
          name="query"
          defaultValue={query ?? ''}
          placeholder="Sok ordernr / email"
          className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select
          name="paymentStatus"
          defaultValue={paymentStatus ?? ''}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Betalning</option>
          {Object.values(PaymentStatus).map((status) => (
            <option key={status} value={status}>
              {formatPaymentStatus(status)}
            </option>
          ))}
        </select>
        <select
          name="orderStatus"
          defaultValue={orderStatus ?? ''}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Orderstatus</option>
          {Object.values(OrderStatus).map((status) => (
            <option key={status} value={status}>
              {formatOrderStatus(status)}
            </option>
          ))}
        </select>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Ordernr</th>
              <th className="px-4 py-3">Kund</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Orderstatus</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Nasta atgard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-semibold text-slate-900 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {order.customerEmail}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatPaymentStatus(order.paymentStatus)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatOrderStatus(order.orderStatus)}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatMoney(order.total, order.currency)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {getNextAction(order)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Inga ordrar matchar filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-500">
          Sida {page} av {totalPages}
        </div>
        <div className="flex gap-2">
          <Link
            {...buildPageHref(searchParams, Math.max(1, page - 1))}
            className={`rounded-lg border px-3 py-1.5 ${
              page <= 1
                ? 'pointer-events-none border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            Forra
          </Link>
          <Link
            {...buildPageHref(searchParams, Math.min(totalPages, page + 1))}
            className={`rounded-lg border px-3 py-1.5 ${
              page >= totalPages
                ? 'pointer-events-none border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700'
            }`}
          >
            Nasta
          </Link>
        </div>
      </div>
    </div>
  );
}
