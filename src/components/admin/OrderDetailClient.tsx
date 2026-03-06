'use client';

import { useMemo, useState, useTransition } from 'react';
import type { OrderActionResult } from '@/app/admin/(protected)/orders/actions';
import {
  markPacked,
  markShipped,
  startPicking,
  updateShipping,
} from '@/app/admin/(protected)/orders/actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { adminText } from '@/lib/ui/adminText';

const toastStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
} as const;

type ToastVariant = keyof typeof toastStyles;

type ToastState = {
  message: string;
  variant: ToastVariant;
} | null;

type OrderItemRow = {
  id: number;
  sku: string | null;
  productName: string;
  variantName: string | null;
  quantity: number;
};

type OrderDetailClientProps = {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItemRow[];
  shippingCarrier: string | null;
  shippingTracking: string | null;
  capturedAt?: string | null;
};

export default function OrderDetailClient({
  orderId,
  orderStatus,
  paymentStatus,
  items,
  shippingCarrier,
  shippingTracking,
}: OrderDetailClientProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [carrier, setCarrier] = useState(shippingCarrier ?? '');
  const [tracking, setTracking] = useState(shippingTracking ?? '');
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();

  const allChecked = checked.size === items.length && items.length > 0;
  const isCaptured = paymentStatus === PaymentStatus.CAPTURED;

  const isReadyToPick =
    orderStatus === OrderStatus.NEW || orderStatus === OrderStatus.READY_TO_PICK;
  const isPicking = orderStatus === OrderStatus.PICKING;
  const isPacked = orderStatus === OrderStatus.PACKED;
  const isShipped =
    orderStatus === OrderStatus.SHIPPED || orderStatus === OrderStatus.COMPLETED;

  const canShip = isPacked && !!carrier.trim() && !!tracking.trim();
  const canUpdateShipping = isShipped && !!carrier.trim() && !!tracking.trim();

  function pushToast(result: OrderActionResult) {
    setToast({ message: result.message, variant: result.ok ? 'success' : 'error' });
    window.setTimeout(() => setToast(null), 2400);
  }

  function runAction(action: () => Promise<OrderActionResult>) {
    startTransition(async () => {
      try {
        const result = await action();
        pushToast(result);
      } catch (error) {
        console.error(error);
        setToast({ message: adminText.genericError, variant: 'error' });
        window.setTimeout(() => setToast(null), 2400);
      }
    });
  }

  const itemRows = useMemo(() => items.map((item) => ({ ...item, key: item.id })), [items]);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${toastStyles[toast.variant]}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {!isCaptured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {adminText.awaitingPayment}
        </div>
      )}

      {isCaptured && (
        <div className="flex flex-wrap items-center gap-3">
          {isReadyToPick && (
            <button
              type="button"
              onClick={() => runAction(() => startPicking(orderId))}
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Starta plock
            </button>
          )}
          {isPicking && (
            <button
              type="button"
              onClick={() => runAction(() => markPacked(orderId))}
              disabled={isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Plock klart
            </button>
          )}
          {isShipped && (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {adminText.shippedBadge}
            </span>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Plockrader</span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => {
                if (allChecked) {
                  setChecked(new Set());
                  return;
                }
                setChecked(new Set(items.map((i) => i.id)));
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900"
            />
            Markera alla
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Done</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Variant</th>
                <th className="px-4 py-3">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemRows.map((item) => (
                <tr key={item.key} className="text-base">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked.has(item.id)}
                      onChange={() => {
                        setChecked((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        });
                      }}
                      className="h-5 w-5 rounded border-slate-300 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.sku ?? adminText.fallback}</td>
                  <td className="px-4 py-3 text-slate-900">{item.productName}</td>
                  <td className="px-4 py-3 text-slate-600">{item.variantName ?? adminText.fallback}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCaptured && (isPacked || isShipped) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="text-sm font-semibold text-slate-900">
            {isPacked ? 'Skicka order' : 'Fraktinfo'}
          </div>

          {isPacked && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Fraktbolag
                  <input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder={adminText.carrierPlaceholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  {adminText.trackingLabel}
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder={adminText.trackingPlaceholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
              {(!carrier.trim() || !tracking.trim()) && (
                <p className="text-xs text-amber-700">
                  {adminText.carrierTrackingRequired}
                </p>
              )}
              <button
                type="button"
                onClick={() =>
                  runAction(() =>
                    markShipped({ orderId, carrier: carrier.trim(), tracking: tracking.trim() }),
                  )
                }
                disabled={isPending || !canShip}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? adminText.sendingLabel : adminText.sendOrderLabel}
              </button>
            </>
          )}

          {isShipped && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-medium">Nuvarande: </span>
                {shippingCarrier ?? adminText.emDash} / {shippingTracking ?? adminText.emDash}
              </div>
              <p className="text-xs text-slate-500">
                {adminText.updateShippingHint}{' '}
                {adminText.noNewEmailSent}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  {adminText.newCarrierLabel}
                  <input
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder={shippingCarrier ?? adminText.carrierPlaceholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  {adminText.newTrackingLabel}
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder={shippingTracking ?? adminText.trackingPlaceholder}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  runAction(() =>
                    updateShipping({ orderId, carrier: carrier.trim(), tracking: tracking.trim() }),
                  )
                }
                disabled={isPending || !canUpdateShipping}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adminText.updateShippingLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
