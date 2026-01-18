// app/components/TopNav.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type Props = {};

import { useCartContext } from "./CartProvider";

export function TopNav(_props: Props) {
  const { totalQty, openCart } = useCartContext();

  return (
    <header className="w-full">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-4 sm:pt-5">
        <nav className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              className="shrink-0"
              style={{ overflow: "visible" }}
              animate={{ scale: [1, 1.06, 1], rotate: [-10, -8, -10] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-label="SAZZE logotyp"
              role="img"
            >
              <motion.circle
                cx="22"
                cy="22"
                r="21"
                fill="rgba(255,255,255,0.18)"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1"
              />

              <motion.text
                x="22"
                y="26"
                textAnchor="middle"
                fill="rgba(255,255,255,0.95)"
                fontWeight="800"
                style={{
                  fontFamily:
                    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial",
                  fontSize: "clamp(12px, 2.2vw, 16px)",
                  letterSpacing: "-0.02em",
                  transform: "skewX(-10deg)",
                  transformOrigin: "22px 22px",
                }}
              >
                SAZZE
              </motion.text>
            </motion.svg>
          </div>

          <div className="flex items-center gap-2 sm:gap-8 text-sm font-semibold text-white/90">
            <Link href="/product?c=vit" className="hover:text-white">
              Shop
            </Link>
            <a className="hidden sm:inline hover:text-white" href="#info">
              Info
            </a>

            <button
              onClick={openCart}
              className="rounded-full bg-white/20 hover:bg-white/30 border border-white/30 px-3 sm:px-4 py-2 transition"
            >
              Varukorg ({totalQty})
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
