'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/context/CartProvider';
import type { WardrobeProduct } from '@/lib/wardrobeApi';

export default function ProductDetailClient({
  product,
}: {
  product: WardrobeProduct;
}) {
  const { add, openCart } = useCartContext();
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [color, setColor] = useState(product.color);

  function selectColor(col: string) {
    if (col === color) return;
    setDirection(col === 'white' || col === 'white' ? 'left' : 'right');
    setColor(col);
  }

  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-center justify-center py-8">
      <div className="phone-frame">
        <div className="phone-scroll">
          <section className="w-full px-4 pt-4 pb-8 product-layout">
            <div className="relative overflow-hidden rounded-[44px] border border-black/10 bg-[#f7f4ee] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]">
              <div className="relative h-[clamp(240px,36vh,380px)] lg:h-[60vh]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={color}
                    initial={{
                      x: direction === 'left' ? '-100%' : '100%',
                      opacity: 0,
                    }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{
                      x: direction === 'left' ? '100%' : '-100%',
                      opacity: 0,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={620}
                      height={620}
                      className="h-auto w-[90%] object-contain"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-6 px-1">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="font-serif text-3xl leading-tight tracking-tight text-black">
                      {product.name}
                    </h1>
                    <p className="mt-1 text-sm text-black/60">
                      {product.material} • {product.style}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-black">
                      {product.price} kr
                    </p>
                    <p className="text-xs text-black/50">
                      Price class: {product.priceClass}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => selectColor(product.color)}
                      aria-pressed={color === product.color}
                      className={
                        'h-10 w-10 rounded-full flex items-center justify-center border transition-shadow ' +
                        (color === product.color
                          ? 'ring-2 ring-emerald-500 border-transparent'
                          : 'border-slate-200 bg-white')
                      }
                    >
                      <span className="sr-only">Color</span>
                      <div
                        className="h-6 w-6 rounded-full"
                        style={{ background: product.color }}
                      />
                    </button>
                  </div>

                  <div className="text-sm text-slate-600">Color</div>
                </div>

                <button
                  onClick={() => {
                    add(product);
                    openCart();
                  }}
                  className="mt-5 h-12 w-full rounded-full bg-black text-sm font-medium text-white active:scale-[0.99]"
                >
                  Add to cart
                </button>

                <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/60">
                  <details className="group px-4 py-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-black">
                      Description
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      {product.name} — {product.material}. Season:{' '}
                      {product.season}.
                    </p>
                  </details>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
