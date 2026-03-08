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

// Canonical size order for sorting
const SIZE_ORDER: Record<string, number> = {
  XXS: 0, XS: 1, S: 2, M: 3, L: 4, XL: 5, XXL: 6, XXXL: 7, '3XL': 7,
  '4XL': 8, '5XL': 9,
};

function sizeRank(s: string): number {
  const upper = s.toUpperCase().trim();
  return SIZE_ORDER[upper] ?? 100;
}

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ra = sizeRank(a);
    const rb = sizeRank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

function hexToLuminance(hex: string): number {
  try {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    const [R, G, B] = [r, g, b].map((c) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  } catch {
    return 0;
  }
}

export default function ProductDetailClient({ product }: Props) {
  const { add, openCart } = useCartContext();
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [sizeError, setSizeError] = useState(false);

  const variants = product.variants;

  // ── Feature flags ────────────────────────────────────────────────────────
  const hasColors = variants.some((v) => v.colorName);
  const hasSizes = variants.some((v) => v.size);

  // ── Unique colors and sizes ───────────────────────────────────────────────
  const uniqueColors = useMemo(() => {
    const seen = new Set<string>();
    return variants
      .filter((v) => v.colorId && v.colorName)
      .filter((v) => {
        if (seen.has(v.colorId!)) return false;
        seen.add(v.colorId!);
        return true;
      });
  }, [variants]);

  const uniqueSizes = useMemo(() => {
    const seen = new Set<string>();
    const raw = variants
      .filter((v) => v.size)
      .reduce<string[]>((acc, v) => {
        if (!seen.has(v.size!)) {
          seen.add(v.size!);
          acc.push(v.size!);
        }
        return acc;
      }, []);
    return sortSizes(raw);
  }, [variants]);

  // ── Selection state (color + size independently) ─────────────────────────
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    () => uniqueColors[0]?.colorId ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(() => {
    // Auto-select if only one size exists
    if (!hasSizes) return null;
    if (uniqueSizes.length === 1) return uniqueSizes[0];
    return null;
  });

  // Sizes for currently selected color only (fades in/out on color change)
  const sizesForColor = useMemo(() => {
    if (!hasColors || !selectedColorId) return uniqueSizes;
    const seen = new Set<string>();
    const raw = variants
      .filter((v) => v.colorId === selectedColorId && v.size)
      .reduce<string[]>((acc, v) => {
        if (!seen.has(v.size!)) { seen.add(v.size!); acc.push(v.size!); }
        return acc;
      }, []);
    return sortSizes(raw);
  }, [variants, hasColors, selectedColorId, uniqueSizes]);

  // ── Resolve selected variant from color + size ────────────────────────────
  const selectedVariant: StorefrontVariant | null = useMemo(() => {
    if (!variants.length) return null;

    // Both color and size: find exact match
    if (hasColors && hasSizes) {
      const match = variants.find(
        (v) => v.colorId === selectedColorId && v.size === selectedSize,
      );
      // Fall back to same color any size, then anything
      return match
        ?? variants.find((v) => v.colorId === selectedColorId)
        ?? variants[0];
    }

    // Only color
    if (hasColors && !hasSizes) {
      return variants.find((v) => v.colorId === selectedColorId)
        ?? variants[0];
    }

    // Only size
    if (!hasColors && hasSizes) {
      return variants.find((v) => v.size === selectedSize)
        ?? variants[0];
    }

    // Neither (single variant)
    return variants[0];
  }, [variants, hasColors, hasSizes, selectedColorId, selectedSize]);

  // ── Image / price ─────────────────────────────────────────────────────────
  const primaryImage =
    (selectedVariant?.images?.length ? selectedVariant.images[0] : null)
    ?? '/product-placeholder.png';

  const currentPriceInCents =
    selectedVariant?.priceInCents ?? product.priceInCents;

  const inStock = (selectedVariant?.stock ?? 0) > 0;

  // ── Size availability ─────────────────────────────────────────────────────
  function isSizeAvailable(size: string): boolean {
    if (hasColors && selectedColorId) {
      // Check if the color+size combination exists and is in stock
      const v = variants.find(
        (v) => v.colorId === selectedColorId && v.size === size,
      );
      return v != null && v.stock > 0;
    }
    const v = variants.find((v) => v.size === size);
    return v != null && v.stock > 0;
  }

  // ── Smart variant label for cart ──────────────────────────────────────────
  const variantDisplayLabel = useMemo(() => {
    if (!selectedVariant) return undefined;
    const parts = [selectedVariant.colorName, selectedVariant.size].filter(Boolean);
    return parts.length > 0 ? parts.join(' / ') : undefined;
  }, [selectedVariant]);

  // ── Color selection handler ───────────────────────────────────────────────
  function handleColorSelect(colorId: string) {
    if (colorId === selectedColorId) return;
    const prev = uniqueColors.findIndex((c) => c.colorId === selectedColorId);
    const next = uniqueColors.findIndex((c) => c.colorId === colorId);
    setDirection(next > prev ? 'right' : 'left');
    setSelectedColorId(colorId);
    setSizeError(false);
    // Clear size selection if that size doesn't exist for the new color
    if (selectedSize) {
      const exists = variants.some((v) => v.colorId === colorId && v.size === selectedSize);
      if (!exists) setSelectedSize(null);
    }
  }

  // ── Add to cart handler ───────────────────────────────────────────────────
  function handleAddToCart() {
    if (!selectedVariant) return;
    if (!inStock) return;
    if (hasSizes && !selectedSize) {
      setSizeError(true);
      return;
    }
    setSizeError(false);
    add({
      variantId: selectedVariant.id,
      sku: selectedVariant.sku,
      productName: product.name,
      variantLabel: variantDisplayLabel,
      unitPrice: currentPriceInCents,
      quantity: 1,
      imageUrl: primaryImage,
      productUrl: `/product/${product.slug}`,
      taxRate: 2500,
      stock: selectedVariant.stock,
    });
    openCart();
  }

  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-start justify-center py-8">
      <div className="phone-frame">
        <div className="phone-scroll">
          <section className="w-full px-4 pt-4 pb-8 product-layout">
            {/* ── Product image ────────────────────────────────────────── */}
            <div className="relative overflow-hidden rounded-[44px] border border-black/10 bg-[#f7f4ee] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.18)]">
              <div className="relative h-[clamp(180px,26vh,320px)] lg:h-[60vh]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedColorId ?? primaryImage}
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

            {/* ── Product info ──────────────────────────────────────────── */}
            <div className="mt-6 px-1">
              {/* Title + price row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl leading-tight tracking-tight text-black">
                    {product.name}
                  </h1>
                  <p className="mt-1 text-sm text-black/60">
                    {product.materialName} • {product.season}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-medium text-black">
                    {formatPriceSekFromOre(currentPriceInCents)}
                  </p>
                  <p className="mt-1 text-xs text-black/60">
                    {inStock
                      ? `I lager (${selectedVariant?.stock ?? 0} st)`
                      : 'Slut i lager'}
                  </p>
                </div>
              </div>

              {/* ── Color selector ──────────────────────────────────────── */}
              {hasColors && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-black/40">
                      Färg
                    </span>
                    <span className="text-xs text-black/60 font-medium transition-all">
                      {selectedVariant?.colorName ?? ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {uniqueColors.map((variant) => {
                      const isActive = variant.colorId === selectedColorId;
                      const bg = variant.colorHex ?? '#ffffff';
                      const isLight = hexToLuminance(bg) > 0.6;

                      return (
                        <button
                          key={variant.colorId}
                          type="button"
                          onClick={() => handleColorSelect(variant.colorId!)}
                          aria-pressed={isActive}
                          aria-label={variant.colorName ?? undefined}
                          className={[
                            'h-9 w-9 rounded-full flex items-center justify-center transition-all duration-150',
                            isActive
                              ? 'ring-2 ring-offset-2 ring-black/70'
                              : 'ring-1 ring-inset ring-black/10 hover:ring-black/30',
                          ].join(' ')}
                          style={{ background: bg }}
                        >
                          {isActive && (
                            <svg
                              viewBox="0 0 12 12"
                              className={[
                                'h-3 w-3',
                                isLight ? 'text-black' : 'text-white',
                              ].join(' ')}
                              fill="none"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Size selector ────────────────────────────────────────── */}
              {hasSizes && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-black/40">
                      Storlek
                    </span>
                    {sizeError && (
                      <motion.span
                        initial={{ opacity: 0, x: 4 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xs text-rose-500 font-medium"
                      >
                        Välj storlek
                      </motion.span>
                    )}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={selectedColorId ?? 'no-color'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-wrap gap-2"
                    >
                      {sizesForColor.map((size) => {
                        const isSelected = selectedSize === size;
                        const available = isSizeAvailable(size);

                        return (
                          <button
                            key={size}
                            type="button"
                            disabled={!available}
                            onClick={() => {
                              setSelectedSize(size);
                              setSizeError(false);
                            }}
                            aria-pressed={isSelected}
                            className={[
                              'relative h-10 min-w-[2.75rem] px-3.5 rounded-full text-[13px] font-medium tracking-wide transition-all duration-150 select-none',
                              isSelected
                                ? 'bg-black text-white border border-black shadow-sm'
                                : available
                                  ? 'bg-white/80 text-black border border-black/15 hover:border-black/40 hover:bg-white active:scale-[0.97]'
                                  : 'bg-white/40 text-black/25 border border-black/8 cursor-not-allowed',
                            ].join(' ')}
                          >
                            {size.toUpperCase()}
                            {!available && (
                              <span
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                aria-hidden
                              >
                                <svg
                                  viewBox="0 0 40 40"
                                  className="absolute inset-0 h-full w-full"
                                  preserveAspectRatio="none"
                                >
                                  <line
                                    x1="6" y1="34" x2="34" y2="6"
                                    stroke="rgba(0,0,0,0.12)"
                                    strokeWidth="1"
                                  />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* ── Add to cart ───────────────────────────────────────────── */}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || !selectedVariant}
                className={[
                  'mt-5 h-13 w-full rounded-full text-sm font-medium tracking-wide transition-all duration-150 active:scale-[0.99]',
                  !inStock || !selectedVariant
                    ? 'bg-slate-300 text-white cursor-not-allowed'
                    : hasSizes && !selectedSize
                      ? 'bg-black/80 text-white hover:bg-black'
                      : 'bg-black text-white hover:bg-black/90',
                ].join(' ')}
              >
                {!inStock
                  ? 'Slut i lager'
                  : hasSizes && !selectedSize
                    ? 'Välj storlek'
                    : 'Lägg i varukorg'}
              </button>

              {/* ── Description accordion ────────────────────────────────── */}
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
          </section>
        </div>
      </div>
    </main>
  );
}

