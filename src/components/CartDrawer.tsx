"use client";

import { formatPrice } from './products';
import type { CartItem as SnapshotItem } from '@/hooks/useCart';

export function CartDrawer({
  open,
  onClose,
  items,
  setQty,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  items: SnapshotItem[];
  setQty: (sku: string, qty: number) => void;
  onCheckout: () => void;
}) {
  const totalInOre = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/30 transition-opacity',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Drawer: mobile-first bottom sheet, desktop right-side sidebar */}
      <aside
        className={[
          'fixed left-0 right-0 bottom-0 h-2/3 bg-white shadow-2xl border-t border-slate-200 rounded-t-2xl',
          'transition-transform transform',
          open ? 'translate-y-0' : 'translate-y-full',
          // md+ => right sidebar
          'md:fixed md:top-0 md:right-0 md:left-auto md:bottom-auto md:h-full md:w-105 md:rounded-none',
          open ? 'md:translate-x-0' : 'md:translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Varukorg</h2>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200"
          >
            Stäng
          </button>
        </div>

        <div className="p-6 space-y-4">
          {items.length === 0 ? (
            <p className="text-slate-600">Din varukorg är tom.</p>
          ) : (
            <>
              {items.map((it) => (
                <div
                  key={it.sku}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{it.productName}</p>
                    <p className="text-sm text-slate-600">{formatPrice(it.unitPrice)} / st</p>
                    {it.variantLabel && (
                      <p className="text-xs text-slate-500">{it.variantLabel}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQty(it.sku, Math.max(0, it.quantity - 1))}
                      className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 font-semibold"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{it.quantity}</span>
                    <button
                      onClick={() => setQty(it.sku, it.quantity + 1)}
                      className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <p className="text-slate-700 font-semibold">Totalt</p>
                <p className="text-slate-900 font-semibold">
                  {formatPrice(totalInOre)}
                </p>
              </div>

              <button
                onClick={onCheckout}
                className="w-full rounded-full py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                Till kassan
              </button>

              <p className="text-xs text-slate-500">
                * Utkast: ingen betalning kopplad ännu.
              </p>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
