'use client';

import { useMemo, useState, useTransition } from 'react';
import type { OrderActionResult } from '@/app/admin/(protected)/orders/actions';
import {
  capturePayment,
  markPacked,
  markShipped,
  startPicking,
  undoPickingToNew,
  undoPacked,
  undoShipped,
  updateShipping,
} from '@/app/admin/(protected)/orders/actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';

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
  capturedAt,
}: OrderDetailClientProps) {
  const [view, setView] = useState<'pick' | 'shipping'>('pick');
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [carrier, setCarrier] = useState(shippingCarrier ?? '');
  const [tracking, setTracking] = useState(shippingTracking ?? '');
  const [toast, setToast] = useState<ToastState>(null);
  const [isPending, startTransition] = useTransition();
  const [showUndoShippedConfirm, setShowUndoShippedConfirm] = useState(false);

  const allChecked = checked.size === items.length && items.length > 0;

  const isPickingActive = orderStatus === OrderStatus.PICKING;
  const canStartPick = new Set<OrderStatus>([
    OrderStatus.NEW,
    OrderStatus.READY_TO_PICK,
  ]).has(orderStatus);

  const pickDisabled = isPending || (!canStartPick && !isPickingActive);
  const undoPickDisabled = isPending || !isPickingActive;

  const packDisabled = isPending || orderStatus !== OrderStatus.PICKING;
  const undoPackedDisabled = isPending || orderStatus !== OrderStatus.PACKED;

  const shipDisabled =
    isPending || orderStatus !== OrderStatus.PACKED || !carrier || !tracking;

  const undoShippedDisabled =
    isPending ||
    orderStatus !== OrderStatus.SHIPPED ||
    paymentStatus === PaymentStatus.CAPTURED;

  const updateShippingDisabled =
    isPending ||
    !new Set<OrderStatus>([
      OrderStatus.PACKED,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
    ]).has(orderStatus) ||
    !carrier ||
    !tracking;

  const captureEnabled =
    !isPending &&
    orderStatus === OrderStatus.SHIPPED &&
    paymentStatus === PaymentStatus.AUTHORIZED;

  const captureVisible =
    orderStatus === OrderStatus.SHIPPED ||
    paymentStatus === PaymentStatus.CAPTURED;

  const captureLabel =
    paymentStatus === PaymentStatus.CAPTURED
      ? 'Betalning capturerad'
      : 'CAPTURE hos Klarna';

  function pushToast(result: OrderActionResult) {
    setToast({
      message: result.message,
      variant: result.ok ? 'success' : 'error',
    });
    window.setTimeout(() => setToast(null), 2400);
  }

  function runAction(action: () => Promise<OrderActionResult>) {
    startTransition(async () => {
      try {
        const result = await action();
        pushToast(result);
      } catch (error) {
        console.error(error);
        setToast({
          message: 'Något gick fel',
          variant: 'error',
        });
        window.setTimeout(() => setToast(null), 2400);
      }
    });
  }

  const itemRows = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        key: item.id,
      })),
    [items],
  );

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-sm">
          <button
            type="button"
            onClick={() => setView('pick')}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              view === 'pick'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Picklist
          </button>
          <button
            type="button"
            onClick={() => setView('shipping')}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              view === 'shipping'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Frakt
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Toggle: Starta plock ↔ Ångra starta plock */}
          {isPickingActive ? (
            <button
              type="button"
              onClick={() => runAction(() => undoPickingToNew(orderId))}
              disabled={undoPickDisabled}
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ångra starta plock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runAction(() => startPicking(orderId))}
              disabled={isPending || !canStartPick}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Starta plock
            </button>
          )}
          <button
            type="button"
            onClick={() => runAction(() => markPacked(orderId))}
            disabled={packDisabled}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Plock klart
          </button>
          <button
            type="button"
            onClick={() => runAction(() => undoPacked(orderId))}
            disabled={undoPackedDisabled}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Ångra packad
          </button>
        </div>
      </div>

      {view === 'pick' ? (
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
                  <th className="px-4 py-3">Location</th>
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
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.sku ?? '–'}
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      {item.productName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.variantName ?? '–'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-slate-500">–</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Fraktbolag
              <input
                value={carrier}
                onChange={(event) => setCarrier(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="PostNord, DHL..."
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Tracking
              <input
                value={tracking}
                onChange={(event) => setTracking(event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                placeholder="Spårningsnummer"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                runAction(() =>
                  markShipped({
                    orderId,
                    carrier: carrier.trim(),
                    tracking: tracking.trim(),
                  }),
                )
              }
              disabled={shipDisabled}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Markera som skickad
            </button>
            <button
              type="button"
              onClick={() => {
                if (!undoShippedDisabled) setShowUndoShippedConfirm(true);
              }}
              disabled={undoShippedDisabled}
              className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ångra skickad
            </button>
            <button
              type="button"
              onClick={() =>
                runAction(() =>
                  updateShipping({
                    orderId,
                    carrier: carrier.trim(),
                    tracking: tracking.trim(),
                  }),
                )
              }
              disabled={updateShippingDisabled}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Uppdatera frakt
            </button>
          </div>

          {(orderStatus === OrderStatus.SHIPPED ||
            orderStatus === OrderStatus.COMPLETED) && (
            <div className="text-xs text-slate-500">
              Du kan justera fraktinfo efter skickad.
            </div>
          )}

          {showUndoShippedConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                <div className="text-lg font-semibold text-slate-900">
                  Ångra skickad?
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Ordern flyttas tillbaka till PACKED. Tracking och fraktinfo
                  behålls.
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUndoShippedConfirm(false)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUndoShippedConfirm(false);
                      runAction(() => undoShipped(orderId));
                    }}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Ångra skickad
                  </button>
                </div>
              </div>
            </div>
          )}

          {captureVisible && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {captureLabel}
                  </div>
                  {paymentStatus === PaymentStatus.CAPTURED && capturedAt && (
                    <div className="text-xs text-slate-500">
                      Captured: {new Date(capturedAt).toLocaleString('sv-SE')}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => runAction(() => capturePayment(orderId))}
                  disabled={!captureEnabled}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  CAPTURE hos Klarna
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
