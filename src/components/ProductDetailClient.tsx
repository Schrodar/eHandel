'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartContext } from '@/context/CartProvider';
import type {
  StorefrontProduct,
  StorefrontVariant,
} from '@/lib/productService';

type Props = {
  product: StorefrontProduct;
};

function formatPriceSekFromOre(amountInOre: number): string {
  return `${Math.round(amountInOre / 100)} kr`;
}

export default function ProductDetailClient({ product }: Props) {
  const { add, openCart } = useCartContext();
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const variants = product.variants;
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );

  const selectedVariant: StorefrontVariant | null = useMemo(() => {
    if (!variants.length) return null;
    const found = variants.find((v) => v.id === selectedVariantId);
    return found ?? variants[0];
  }, [selectedVariantId, variants]);

  const currentImages = selectedVariant?.images?.length
    ? selectedVariant.images
    : [];

  const primaryImage = currentImages[0] ?? '/product-placeholder.png';

  const currentPriceInCents =
    selectedVariant?.priceInCents ?? product.priceInCents;
  const colorLabel = selectedVariant?.colorName ?? 'Standard';
  const inStock = (selectedVariant?.stock ?? 0) > 0;

  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-center justify-center py-8">
      <div className="phone-frame">
        <div className="phone-scroll">
          <section className="w-full px-4 pt-4 pb-8 product-layout">
            <div className="relative overflow-hidden rounded-[44px] border border-black/10 bg-[#f7f4ee] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]">
              <div className="relative h-[clamp(240px,36vh,380px)] lg:h-[60vh]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedVariant?.id ?? 'default'}
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
                      src={primaryImage}
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
                      {product.materialName} • {product.season}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-black">
                      {formatPriceSekFromOre(currentPriceInCents)}
                    </p>
                    <p className="text-xs text-black/50">
                      Price class: {product.priceClass}
                    </p>
                    <p className="mt-1 text-xs text-black/60">
                      {inStock
                        ? `I lager (${selectedVariant?.stock ?? 0} st)`
                        : 'Slut i lager'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    {variants.map((variant) => {
                      const isActive = variant.id === selectedVariant?.id;
                      const background = variant.colorHex ?? '#ffffff';

                      // Determine if the color is light to choose a contrasting outline.
                      // Simple luminance approximation from hex.
                      function hexToRgb(hex: string) {
                        const h = hex.replace('#', '');
                        const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
                        const r = (bigint >> 16) & 255;
                        const g = (bigint >> 8) & 255;
                        const b = bigint & 255;
                        return { r, g, b };
                      }

                      function isLightColor(hex: string) {
                        try {
                          const { r, g, b } = hexToRgb(hex);
                          // Relative luminance formula
                          const [R, G, B] = [r, g, b].map((c) => {
                            const v = c / 255;
                            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
                          });
                          const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
                          return L > 0.6; // threshold; tweak if needed
                        } catch {
                          return false;
                        }
                      }

                      const light = isLightColor(background);

                      return (
                          <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            if (variant.id === selectedVariantId) return;
                            setDirection(isActive ? 'left' : 'right');
                            setSelectedVariantId(variant.id);
                          }}
                          aria-pressed={isActive}
                          className={
                            'h-10 w-10 rounded-full flex items-center justify-center border transition-shadow ' +
                            (isActive
                              ? (light ? 'ring-2 ring-emerald-500 border-transparent bg-stone-100' : 'ring-2 ring-emerald-500 border-transparent')
                              : (light ? 'border-slate-200 bg-stone-100' : 'border-slate-200 bg-white'))
                          }
                        >
                          <span className="sr-only">{variant.colorName}</span>
                          <div
                            className={
                              'h-6 w-6 rounded-full transition-colors ' +
                              (isActive
                                ? 'ring-2 ring-inset ring-white border border-slate-200'
                                : light
                                  ? 'ring-1 ring-inset ring-black/10 border border-slate-200'
                                  : 'ring-1 ring-inset ring-white')
                            }
                            style={{ background }}
                          />
                        </button>
                      );
                    })}
                  </div>

                  <div className="text-sm text-slate-600">
                    {colorLabel}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!selectedVariant) return;
                    if (!inStock) return;

                    add({
                      variantId: selectedVariant.id,
                      sku: selectedVariant.sku,
                      productName: product.name,
                      variantLabel: selectedVariant.colorName ?? undefined,
                      unitPrice: currentPriceInCents,
                      quantity: 1,
                      imageUrl: primaryImage,
                      productUrl: `/product/${product.slug}`,
                      taxRate: 2500,
                      stock: selectedVariant.stock,
                    });
                    openCart();
                  }}
                  disabled={!inStock || !selectedVariant}
                  className="mt-5 h-12 w-full rounded-full bg-black text-sm font-medium text-white active:scale-[0.99] disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {inStock ? 'Lägg i varukorg' : 'Slut i lager'}
                </button>

                <div className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/60">
                  <details className="group px-4 py-4">
                    <summary className="cursor-pointer list-none text-sm font-medium text-black">
                      Description
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-black/70">
                      {product.description?.trim()
                        ? product.description
                        : `${product.name} — ${product.materialName}. Season: ${product.season}.`}
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
