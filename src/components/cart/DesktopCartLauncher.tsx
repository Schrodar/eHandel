'use client';

import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/context/CartProvider';

export function DesktopCartLauncher() {
  const { items, openCart, cartOpen } = useCartContext();
  // Render nothing on the server to avoid hydration mismatch (cart lives in localStorage)
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
  const hasItems = totalQty > 0;

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {hasItems && !cartOpen && (
        <motion.button
          key="desktop-launcher"
          onClick={openCart}
          aria-label={`Varukorg – ${totalQty} ${totalQty === 1 ? 'vara' : 'varor'}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className={[
            /* only visible on md+ */
            'hidden md:flex flex-col items-center justify-center gap-1',
            'fixed right-4 top-8 z-40',
            'w-11 h-11 rounded-xl',
            'bg-white/75 backdrop-blur-md',
            'border border-black/5',
            'shadow-lg',
            'text-slate-700 cursor-pointer',
          ].join(' ')}
        >
          {/* Cart icon */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
            {/* Badge */}
            <span className="absolute -right-2.5 -top-2.5 flex min-w-[1.1rem] items-center justify-center rounded-full bg-emerald-600 px-1 py-0.5 text-[10px] font-bold leading-none text-white">
              {totalQty > 99 ? '99+' : totalQty}
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
