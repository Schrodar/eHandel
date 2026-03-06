'use client';

import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/context/CartProvider';
import { formatPrice } from '@/components/products';

export function CartPanel() {
  const { items, openCheckout } = useCartContext();
  // Render nothing on the server to avoid hydration mismatch (cart lives in localStorage)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalOre = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const hasItems = totalQty > 0;

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {hasItems && (
        <motion.div
          key="cart-panel"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
          aria-label="Varukorg"
        >
          <div className="mx-auto max-w-3xl px-4 pb-4 pointer-events-auto">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/80 px-5 py-3.5 shadow-lg backdrop-blur-md">
              {/* Left: cart icon + count */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-slate-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 3h1.386c.51 0 .955.343 1.087.836l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.962-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.273M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                    />
                  </svg>
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold leading-none text-white">
                    {totalQty}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-600 hidden sm:block">
                  {totalQty} {totalQty === 1 ? 'vara' : 'varor'}
                </span>
              </div>

              {/* Center: total */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <span className="text-xs text-slate-500 leading-tight">Totalt inkl. moms</span>
                <span className="text-base font-bold text-slate-900 leading-tight tabular-nums">
                  {formatPrice(totalOre)}
                </span>
              </div>

              {/* Right: CTA */}
              <button
                onClick={openCheckout}
                className="shrink-0 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.97] transition-all"
              >
                Till kassan&nbsp;→
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
