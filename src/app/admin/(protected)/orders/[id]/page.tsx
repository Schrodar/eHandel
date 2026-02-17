import { notFound } from 'next/navigation';
import { getOrderById } from '@/lib/orders/queries';
import OrderDetailClient from '@/components/admin/OrderDetailClient';

export const metadata = {
  title: 'Admin – Order',
};

export const dynamic = 'force-dynamic';

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(value: Date | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderById(params.id);

  if (!order) return notFound();

  const customer = {
    name: order.customerName,
    email: order.customerEmail,
    phone: order.customerPhone ?? '—',
  };

  const shippingAddress = [
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    `${order.shippingPostalCode} ${order.shippingCity}`,
    order.shippingCountry,
  ].filter(Boolean);

  const billingAddress = [
    order.billingAddressLine1,
    order.billingAddressLine2,
    order.billingPostalCode && order.billingCity
      ? `${order.billingPostalCode} ${order.billingCity}`
      : null,
    order.billingCountry,
  ].filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm text-slate-500">Order</div>
              <h1 className="text-2xl font-semibold text-slate-900">
                {order.orderNumber}
              </h1>
            </div>
            <div className="text-sm text-slate-600">
              Skapad: {formatDate(order.createdAt)}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs uppercase text-slate-500">Payment</div>
              <div className="font-semibold text-slate-900">
                {order.paymentStatus}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs uppercase text-slate-500">
                Orderstatus
              </div>
              <div className="font-semibold text-slate-900">
                {order.orderStatus}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs uppercase text-slate-500">Klarna ID</div>
              <div className="font-semibold text-slate-900">
                {order.klarnaOrderId ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <OrderDetailClient
          orderId={order.id}
          orderStatus={order.orderStatus}
          paymentStatus={order.paymentStatus}
          items={order.items.map((item) => ({
            id: item.id,
            sku: item.sku,
            productName: item.productName,
            variantName: item.variantName,
            quantity: item.quantity,
          }))}
          shippingCarrier={order.shippingCarrier}
          shippingTracking={order.shippingTracking}
          capturedAt={order.capturedAt?.toISOString() ?? null}
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Kund</div>
          <div className="mt-2 text-sm">
            <div className="font-semibold text-slate-900">{customer.name}</div>
            <div className="text-slate-600">{customer.email}</div>
            <div className="text-slate-600">{customer.phone}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="text-xs uppercase text-slate-500">Leveransadress</div>
          <div className="mt-2 space-y-1 text-slate-700">
            {shippingAddress.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="text-xs uppercase text-slate-500">Fakturaadress</div>
          <div className="mt-2 space-y-1 text-slate-700">
            {billingAddress.length > 0 ? (
              billingAddress.map((line) => <div key={line}>{line}</div>)
            ) : (
              <div className="text-slate-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="text-xs uppercase text-slate-500">Totals</div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(order.subtotal, order.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Frakt</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(order.shipping, order.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Rabatt</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(order.discount, order.currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Moms</span>
              <span className="font-semibold text-slate-900">
                {formatMoney(order.tax, order.currency)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
              <span className="text-slate-600">Total</span>
              <span className="text-lg font-semibold text-slate-900">
                {formatMoney(order.total, order.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="text-xs uppercase text-slate-500">Tidslinje</div>
          <div className="mt-2 space-y-1 text-slate-600">
            <div>Authorized: {formatDate(order.authorizedAt)}</div>
            <div>Captured: {formatDate(order.capturedAt)}</div>
            <div>Shipped: {formatDate(order.shippedAt)}</div>
          </div>
        </div>
      </aside>
    </div>
  );
}
