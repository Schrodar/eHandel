/**
 * ActivationStatusBanner.tsx
 *
 * Visar en variant's aktiverings-status med checkboxes:
 * - ✓ Minst 1 bild
 * - ✓ Exakt 1 primary bild
 * - ✓ Primary bild är ready
 * - ✓ Primary har giltig URL
 *
 * Om alla villkor är uppfyllda → grön banner
 * Om något saknas → röd banner med lista av blockeringar
 */

'use client';

import { canActivateVariant, getPrimaryImage } from '@/lib/mediaPolicy';

type VariantWithImages = {
  id: string;
  active: boolean;
  sku: string;
  priceInCents?: number | null;
  variantImages: Array<{
    variantId: string;
    assetId: string;
    role: string;
    sortOrder: number;
    asset: {
      id: string;
      url: string;
      alt: string | null;
      width: number | null;
      height: number | null;
      createdAt: Date;
      status: string;
      type: string;
      updatedAt: Date;
    };
    createdAt: Date;
  }>;
};

type Props = {
  variant: VariantWithImages;
};

export default function ActivationStatusBanner({ variant }: Props) {
  const { canActivate } = canActivateVariant(variant);
  const primaryImage = getPrimaryImage(variant);

  // Build detailed checklist
  const hasImages = variant.variantImages.length > 0;
  const hasPrimary = variant.variantImages.some((vi) => vi.role === 'primary');
  const primaryReady = primaryImage ? primaryImage.status === 'ready' : false;
  const primaryUrlValid = primaryImage
    ? /^https?:\/\//.test(primaryImage.url)
    : false;
  const hasPrice = variant.priceInCents != null;

  if (canActivate) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Redo att aktiveras
        </div>
        <ul className="mt-2 space-y-1 text-xs text-emerald-800">
          <li className="flex items-center gap-1">
            <span className="text-emerald-600">✓</span> Minst 1 bild
          </li>
          <li className="flex items-center gap-1">
            <span className="text-emerald-600">✓</span> Exakt 1 primär bild
          </li>
          <li className="flex items-center gap-1">
            <span className="text-emerald-600">✓</span> Primär bild är klar
          </li>
          <li className="flex items-center gap-1">
            <span className="text-emerald-600">✓</span> Primär bild har giltig
            URL
          </li>
          <li className="flex items-center gap-1">
            <span className="text-emerald-600">✓</span> Pris är satt
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        Kan inte aktiveras
      </div>
      <ul className="mt-2 space-y-1 text-xs text-rose-800">
        <li
          className={`flex items-center gap-1 ${hasImages ? 'text-emerald-700' : ''}`}
        >
          <span className={hasImages ? 'text-emerald-600' : 'text-rose-600'}>
            {hasImages ? '✓' : '✗'}
          </span>
          Minst 1 bild
        </li>
        <li
          className={`flex items-center gap-1 ${hasPrimary ? 'text-emerald-700' : ''}`}
        >
          <span className={hasPrimary ? 'text-emerald-600' : 'text-rose-600'}>
            {hasPrimary ? '✓' : '✗'}
          </span>
          Exakt 1 primär bild
        </li>
        {hasPrimary && (
          <li
            className={`flex items-center gap-1 ${primaryReady ? 'text-emerald-700' : ''}`}
          >
            <span
              className={primaryReady ? 'text-emerald-600' : 'text-rose-600'}
            >
              {primaryReady ? '✓' : '✗'}
            </span>
            Primär bild är klar
          </li>
        )}
        {hasPrimary && (
          <li
            className={`flex items-center gap-1 ${primaryUrlValid ? 'text-emerald-700' : ''}`}
          >
            <span
              className={primaryUrlValid ? 'text-emerald-600' : 'text-rose-600'}
            >
              {primaryUrlValid ? '✓' : '✗'}
            </span>
            Primär bild har giltig URL
          </li>
        )}
        <li
          className={`flex items-center gap-1 ${hasPrice ? 'text-emerald-700' : ''}`}
        >
          <span className={hasPrice ? 'text-emerald-600' : 'text-rose-600'}>
            {hasPrice ? '✓' : '✗'}
          </span>
          Pris är satt
        </li>
      </ul>
    </div>
  );
}
