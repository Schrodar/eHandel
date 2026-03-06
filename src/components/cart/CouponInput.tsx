'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AppliedDiscount } from '@/hooks/useCart';
import type { CartItem } from '@/hooks/useCart';
import { formatPrice } from '@/components/products';

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

type Props = {
  /** Cart items — sent to server so discount scoping can be evaluated */
  items: CartItem[];
  appliedDiscount: AppliedDiscount | null;
  onApply: (discount: AppliedDiscount) => void;
  onRemove: () => void;
};

function buildErrorMessage(data: Extract<ValidateResponse, { valid: false }>): string {
  switch (data.reason) {
    case 'NOT_FOUND':
      return 'Rabattkoden finns inte.';
    case 'DRIVE_INACTIVE':
      return 'Den här rabattkoden är inte längre aktiv.';
    case 'CODE_EXHAUSTED':
      return 'Rabattkoden har redan använts det maximala antalet gånger.';
    case 'NOT_APPLICABLE_TO_CART': {
      const hint = data.appliedToHint;
      if (hint) return `Koden gäller för: ${hint.label}`;
      return 'Rabattkoden gäller inte för produkterna i din varukorg.';
    }
    case 'MIN_ORDER_NOT_MET':
      if (data.requiredMinOrder !== undefined && data.eligibleSubtotal !== undefined) {
        return `Koden kräver minst ${formatPrice(data.requiredMinOrder)} (din summa: ${formatPrice(data.eligibleSubtotal)}).`;
      }
      return 'Ordervärdet uppfyller inte minimikravet för den här koden.';
    default:
      return 'Ogiltig rabattkod.';
  }
}

export function CouponInput({ items, appliedDiscount, onApply, onRemove }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<{ label: string; shopLink?: string } | null>(null);

  async function handleApply() {
    const code = inputValue.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    setHint(null);
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
        setInputValue('');
      } else {
        setError(buildErrorMessage(data));
        if (data.reason === 'NOT_APPLICABLE_TO_CART' && data.appliedToHint) {
          setHint(data.appliedToHint);
        }
      }
    } catch {
      setError('Kunde inte verifiera rabattkoden. Försök igen.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleApply();
    }
  }

  // ── Applied state ──────────────────────────────────────────────────────────
  if (appliedDiscount) {
    const totalSaving =
      appliedDiscount.discountAmount + appliedDiscount.shippingDiscountAmount;
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800 tracking-wide">
              RABATT TILLAGD
            </p>
            <p className="text-sm font-bold text-emerald-900 truncate">
              {appliedDiscount.code}
              <span className="ml-2 font-normal text-emerald-700">
                −{formatPrice(totalSaving)}
              </span>
            </p>
          </div>
          <button
            onClick={onRemove}
            aria-label="Ta bort rabattkod"
            className="shrink-0 text-xs text-emerald-700 hover:text-red-600 underline transition"
          >
            Ta bort
          </button>
        </div>
        {appliedDiscount.appliedToHint.kind !== 'global' && (
          <p className="text-xs text-emerald-700">
            Gäller för: {appliedDiscount.appliedToHint.label}
          </p>
        )}
      </div>
    );
  }

  // ── Input state ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value.toUpperCase());
            setError(null);
            setHint(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rabattkod"
          disabled={loading}
          className={[
            'flex-1 min-w-0 rounded-xl border px-3 py-2 text-sm font-medium tracking-wider',
            'bg-white text-slate-900 placeholder:text-slate-400',
            'focus:outline-none focus:ring-2 focus:ring-slate-400 transition',
            error ? 'border-red-400' : 'border-slate-200',
            loading ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        />
        <button
          onClick={() => void handleApply()}
          disabled={loading || inputValue.trim().length === 0}
          className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '…' : 'Använd'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 pl-1">
          {error}
          {hint?.shopLink && (
            <>
              {' '}
              <Link href={hint.shopLink} className="underline hover:text-red-800">
                Se produkter →
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
