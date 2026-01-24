'use client';

import type { Product } from './products';
import { formatPrice } from './products';

type CartItem = { product: Product; qty: number };

export function CartDrawer({
  open,
  onClose,
  items,
  setQty,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  setQty: (id: Product['id'], qty: number) => void;
  onCheckout: () => void;
}) {
  const totalInOre = items.reduce(
    (sum, it) => sum + it.product.priceInOre * it.qty,
    0,
  );

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

      {/* Drawer */}
      <aside
        className={[
          'fixed right-0 top-0 h-full w-105 bg-white shadow-2xl border-l border-slate-200',
          'transition-transform',
          open ? 'translate-x-0' : 'translate-x-full',
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
                  key={it.product.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {it.product.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatPrice(it.product.priceInOre)} / st
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setQty(it.product.id, Math.max(0, it.qty - 1))
                      }
                      className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 font-semibold"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {it.qty}
                    </span>
                    <button
                      onClick={() => setQty(it.product.id, it.qty + 1)}
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
