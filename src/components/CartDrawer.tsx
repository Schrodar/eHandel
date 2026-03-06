"use client";

import { formatPrice } from './products';
import type { CartItem as SnapshotItem, AppliedDiscount } from '@/hooks/useCart';
import { CouponInput } from '@/components/cart/CouponInput';
import { MobileCouponBox } from '@/components/cart/MobileCouponBox';

export function CartDrawer({
  open,
  onClose,
  items,
  setQty,
  onCheckout,
  coupon,
  onApplyCoupon,
  onRemoveCoupon,
}: {
  open: boolean;
  onClose: () => void;
  items: SnapshotItem[];
  setQty: (sku: string, qty: number) => void;
  onCheckout: () => void;
  coupon: AppliedDiscount | null;
  onApplyCoupon: (c: AppliedDiscount) => void;
  onRemoveCoupon: () => void;
}) {
  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const discount = coupon
    ? Math.min(coupon.discountAmount + coupon.shippingDiscountAmount, subtotal)
    : 0;
  const total = subtotal - discount;

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
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Varukorg</h2>
            {items.length > 0 && (
              <p className="text-xs text-slate-500 mt-0.5">{items.length} {items.length === 1 ? 'artikel' : 'artiklar'}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200 transition"
          >
            Stäng
          </button>
        </div>

        <div className="flex flex-col h-[calc(100%-4.5rem)] p-5">
          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.962-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.273M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              <p className="text-sm">Din varukorg är tom</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 flex-1 overflow-y-auto">
              {/* Product rows */}
              <ul className="space-y-3">
                {items.map((it) => (
                  <li
                    key={it.sku}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{it.productName}</p>
                      {it.variantLabel && (
                        <p className="text-xs text-slate-500 mt-0.5">{it.variantLabel}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{formatPrice(it.unitPrice)} / st</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setQty(it.sku, Math.max(0, it.quantity - 1))}
                        aria-label="Minska antal"
                        className="h-7 w-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-slate-800">{it.quantity}</span>
                      <button
                        onClick={() => setQty(it.sku, it.quantity + 1)}
                        aria-label="Öka antal"
                        className="h-7 w-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>

                    <p className="w-16 text-right text-sm font-semibold text-slate-900 shrink-0">
                      {formatPrice(it.unitPrice * it.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Totals + CTA — sticky at bottom */}
              <div className="mt-auto pt-4 border-t border-slate-200 space-y-4">
                {/* Subtotal row (always shown) */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-baseline justify-between text-slate-600">
                    <span>Delsumma</span>
                    <span className="font-medium text-slate-800">{formatPrice(subtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex items-baseline justify-between text-emerald-700">
                      <span>Rabatt ({coupon?.code})</span>
                      <span className="font-semibold">−{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-600">Totalt (inkl. moms)</span>
                    <span className="text-xl font-bold text-slate-900">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Coupon input — mobile accordion (md:hidden) */}
                <div className="md:hidden">
                  <MobileCouponBox
                    items={items}
                    appliedDiscount={coupon}
                    onApply={onApplyCoupon}
                    onRemove={onRemoveCoupon}
                  />
                </div>

                {/* Coupon input — desktop inline (hidden on mobile) */}
                <div className="hidden md:block">
                  <p className="text-xs text-slate-500 mb-1.5">Har du en rabattkod?</p>
                  <CouponInput
                    items={items}
                    appliedDiscount={coupon}
                    onApply={onApplyCoupon}
                    onRemove={onRemoveCoupon}
                  />
                </div>

                <button
                  onClick={onCheckout}
                  disabled={items.length === 0}
                  className="w-full rounded-full py-3.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Till kassan →
                </button>

                <p className="text-xs text-center text-slate-400">
                  Säker betalning via Stripe
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
