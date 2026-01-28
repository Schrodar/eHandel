// app/components/TopNav.tsx
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

import { useCartContext } from '@/context/CartProvider';

export function TopNav() {
  const { totalQty, openCart } = useCartContext();

  return (
    <header className="w-full topnav">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <nav className="flex items-center justify-between gap-3">
          {/* Logan som pulserar */}
          <div className="logo">
            <motion.div
              className="shrink-0"
              aria-label="SAZZE logotyp"
              role="img"
              animate={{ scale: [1, 1.06, 1], rotate: [-6, 6, -6] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ display: 'inline-block', transformOrigin: '22px 22px' }}
            >
              <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                style={{ overflow: 'visible' }}
              >
                <circle
                  cx="22"
                  cy="22"
                  r="21"
                  fill="rgba(233,174,183,0.18)"
                  stroke="rgba(233,174,183,0.35)"
                  strokeWidth="1"
                />
                <text
                  x="22"
                  y="26"
                  textAnchor="middle"
                  fill="#E9AEB7"
                  fontWeight="800"
                  style={{
                    fontFamily:
                      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial',
                    fontSize: 'clamp(12px, 2.2vw, 16px)',
                    letterSpacing: '-0.02em',
                    transform: 'skewX(-10deg)',
                    transformOrigin: '22px 22px',
                  }}
                >
                  SAZZE
                </text>
              </svg>
            </motion.div>
          </div>

          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link
              href="/shop"
              className="hover:opacity-90"
              style={{ color: 'var(--accent-2)' }}
            >
              Shop
            </Link>
            <button
              onClick={openCart}
              className="btn-ghost"
              aria-label="Open cart"
            >
              Varukorg ({totalQty})
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
