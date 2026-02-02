// app/components/TopNav.tsx
'use client';

import { MotionConfig, motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useCartContext } from '@/context/CartProvider';

export function TopNav() {
  const { totalQty, openCart } = useCartContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayQty = mounted ? totalQty : 0;

  return (
    <header className="w-full topnav">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <nav className="flex items-center justify-between gap-3">
          {/* Logan som pulserar */}
          <div className="logo">
            <MotionConfig reducedMotion="never">
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
                <motion.svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  style={{ overflow: 'visible' }}
                >
                  <motion.circle
                    cx="22"
                    cy="22"
                    r="21"
                    fill="rgba(255, 255, 255, 0.18)"
                    stroke="rgba(74, 66, 68, 0.35)"
                    strokeWidth="1"
                  />
                  <motion.text
                    x="22"
                    y="26"
                    textAnchor="middle"
                    fill="#000000"
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
                  </motion.text>
                </motion.svg>
              </motion.div>
            </MotionConfig>
          </div>

          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link
              href="/shop"
              className="hover:opacity-90"
              style={{ color: 'var(--accent-2)' }}
            >
              Shop
            </Link>
            <Link
              href="/contact"
              className="hover:opacity-90"
              style={{ color: 'var(--accent-2)' }}
            >
              Info
            </Link>
            <button
              onClick={openCart}
              className="btn-ghost"
              aria-label="Open cart"
            >
              Varukorg ({displayQty})
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
