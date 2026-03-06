'use client';

/**
 * MobileCouponBox — rabattkod-sektion ENBART för mobil (md:hidden).
 *
 * Flödet:
 *  COLLAPSED  →  OPEN (knapptryck) →  LOADING  →  SUCCESS | ERROR
 *
 * Animationer via Framer Motion (AnimatePresence + layout-animation).
 * Inga layout-hopp: höjd-transition sker med AnimatePresence + height auto.
 */

import { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import type { AppliedDiscount, CartItem } from '@/hooks/useCart';
import { formatPrice } from '@/components/products';

// ─── API types ─────────────────────────────────────────────────────────────────

type ValidateResponse =
  | {
      valid: true;
      code: string;
      driveId: string;
      driveName: string;
      discountAmount: number;
      shippingDiscountAmount: number;
      eligibleSubtotal: number;
      appliedToHint: { kind: string; label: string; shopLink?: string };
    }
  | {
      valid: false;
      reason: string;
      appliedToHint?: { kind: string; label: string; shopLink?: string };
      requiredMinOrder?: number;
      eligibleSubtotal?: number;
    };

// ─── Error builder ─────────────────────────────────────────────────────────────

type InvalidResponse = Extract<ValidateResponse, { valid: false }>;

function buildErrorMessage(data: InvalidResponse): string {
  switch (data.reason) {
    case 'NOT_FOUND':
      return 'Koden finns inte.';
    case 'DRIVE_INACTIVE':
      return 'Koden är inte längre aktiv.';
    case 'CODE_EXHAUSTED':
      return 'Koden är redan fullt använd.';
    case 'NOT_APPLICABLE_TO_CART':
      return data.appliedToHint
        ? `Koden gäller för: ${data.appliedToHint.label}`
        : 'Koden gäller inte för varorna i din varukorg.';
    case 'MIN_ORDER_NOT_MET':
      return data.requiredMinOrder !== undefined && data.eligibleSubtotal !== undefined
        ? `Kräver minst ${formatPrice(data.requiredMinOrder)} (din summa: ${formatPrice(data.eligibleSubtotal)}).`
        : 'Minsta ordervärde är inte uppnått.';
    default:
      return 'Ogiltig rabattkod.';
  }
}

// ─── Animation variants ────────────────────────────────────────────────────────

const panelVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
  exit:   { opacity: 0, height: 0 },
};

const panelTransition = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

const feedbackVariants = {
  hidden:  { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
};

const feedbackTransition = { duration: 0.18 };

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  items: CartItem[];
  appliedDiscount: AppliedDiscount | null;
  onApply: (discount: AppliedDiscount) => void;
  onRemove: () => void;
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function MobileCouponBox({ items, appliedDiscount, onApply, onRemove }: Props) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shopLink, setShopLink] = useState<string | null>(null);

  // ── Applied state ────────────────────────────────────────────────────────────

  if (appliedDiscount) {
    const saving = appliedDiscount.discountAmount + appliedDiscount.shippingDiscountAmount;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Icon + text */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-full bg-emerald-100 flex items-center justify-center">
              {/* Ticket icon */}
              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 0 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 0 1 0-4V7a2 2 0 0 0-2-2H5Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide leading-none mb-0.5">
                Rabatt tillagd
              </p>
              <p className="text-sm font-bold text-emerald-900 truncate leading-snug">
                {appliedDiscount.code}
                <span className="ml-1.5 font-medium text-emerald-700">
                  −{formatPrice(saving)}
                </span>
              </p>
              {appliedDiscount.appliedToHint.kind !== 'global' && (
                <p className="text-xs text-emerald-600 mt-0.5 leading-none truncate">
                  Gäller för: {appliedDiscount.appliedToHint.label}
                </p>
              )}
            </div>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Ta bort rabattkod"
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            Ta bort
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Input state ──────────────────────────────────────────────────────────────

  async function handleApply() {
    const code = value.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    setShopLink(null);
    try {
      const res = await fetch('/api/discounts/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      const data = (await res.json()) as ValidateResponse;
      if (data.valid) {
        onApply({
          code: data.code,
          driveId: data.driveId,
          driveName: data.driveName,
          discountAmount: data.discountAmount,
          shippingDiscountAmount: data.shippingDiscountAmount,
          eligibleSubtotal: data.eligibleSubtotal,
          appliedToHint: data.appliedToHint,
        });
        setValue('');
        setOpen(false);
      } else {
        setError(buildErrorMessage(data));
        if (data.reason === 'NOT_APPLICABLE_TO_CART' && data.appliedToHint?.shopLink) {
          setShopLink(data.appliedToHint.shopLink);
        }
      }
    } catch {
      setError('Kunde inte nå servern. Försök igen.');
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    setOpen((prev) => {
      if (!prev) {
        // Focus input on next tick after panel opens
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      return !prev;
    });
    setError(null);
    setShopLink(null);
  }

  return (
    <motion.div layout className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2">
          {/* Tag icon */}
          <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
          </svg>
          Rabattkod
        </span>
        {/* Chevron */}
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="h-4 w-4 text-slate-400 shrink-0"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </motion.svg>
      </button>

      {/* Expandable input panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={panelTransition}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2">
              {/* Label (sr-only) + input row */}
              <label htmlFor={inputId} className="sr-only">
                Ange rabattkod
              </label>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  id={inputId}
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value.toUpperCase());
                    setError(null);
                    setShopLink(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && void handleApply()}
                  placeholder="Skriv kod…"
                  disabled={loading}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-describedby={error ? errorId : undefined}
                  aria-invalid={!!error}
                  className={[
                    'flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm font-medium tracking-widest',
                    'bg-white text-slate-900 placeholder:text-slate-400 placeholder:tracking-normal',
                    'focus:outline-none focus:ring-2 focus:ring-slate-400 transition-shadow',
                    error ? 'border-red-400 bg-red-50/30' : 'border-slate-200',
                    loading ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                />
                <button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={loading || value.trim().length === 0}
                  className={[
                    'shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                    'bg-slate-900 text-white active:scale-95',
                    'hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-500',
                    'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
                  ].join(' ')}
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      {/* Spinner */}
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                      </svg>
                      Kontrollerar…
                    </span>
                  ) : (
                    'Använd'
                  )}
                </button>
              </div>

              {/* Error / hint feedback */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    id={errorId}
                    role="alert"
                    variants={feedbackVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    transition={feedbackTransition}
                    className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 space-y-1"
                  >
                    <p>{error}</p>
                    {shopLink && (
                      <Link
                        href={shopLink}
                        className="inline-flex items-center gap-1 font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                      >
                        Visa i shop →
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
