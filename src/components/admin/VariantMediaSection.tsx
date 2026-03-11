'use client';

/**
 * VariantMediaSection – affärsregel: exakt 0 eller 1 bild per variant.
 *
 * Tidigare bug: flödet anropade addVariantImageAction() (create) flera gånger
 * och hanterade inte att raden kanske redan existerade, vilket orsakade P2002
 * på både (variantId, role) och (variantId, assetId)-constraints.
 *
 * Fix: setVariantImageAction() kör deleteMany+create i transaktion så det
 * aldrig kan bli duplikat. UI visar bara én bild — inget multi-select.
 */

import { useState } from 'react';
import { getPrimaryImage, getActivationStatus } from '@/lib/mediaPolicy';
import ActivationStatusBanner from './ActivationStatusBanner';
import {
  toggleVariantActive,
  setVariantImageAction,
  removeVariantImageAction,
} from '@/app/admin/(protected)/media/actions';
import MediaPickerModal from './MediaPickerModal';

type Asset = {
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

type VariantImage = {
  variantId: string;
  assetId: string;
  role: string;
  sortOrder: number;
  asset: Asset;
  createdAt: Date;
};

type VariantWithImages = {
  id: string;
  active: boolean;
  sku: string;
  priceInCents?: number | null;
  variantImages: (VariantImage & { asset: Asset })[];
};

type Props = {
  variant: VariantWithImages;
  onSuccess?: () => void;
};

export default function VariantMediaSection({ variant, onSuccess }: Props) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoadingToggle, setIsLoadingToggle] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryImage = getPrimaryImage(variant);
  const activationStatus = getActivationStatus(variant);
  const isActivating = isLoadingToggle && !variant.active;

  const handleToggleActive = async () => {
    if (isLoadingToggle) return;
    if (activationStatus.status === 'blocked') {
      setError(`Kan inte aktivera: ${activationStatus.reason}`);
      return;
    }
    setIsLoadingToggle(true);
    setError(null);
    try {
      await toggleVariantActive(variant.id, !variant.active);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ett fel uppstod');
    } finally {
      setIsLoadingToggle(false);
    }
  };

  /**
   * Called by MediaPickerModal with an array of selected assetIds.
   * We only use the first one (maxSelect=1 in the picker, so it's always length 1).
   * setVariantImageAction atomically replaces any existing image.
   */
  const handlePickerSelect = async (assetIds: string[]) => {
    const assetId = assetIds[0];
    if (!assetId) return;

    // Guard against double-submit from rapid clicks
    if (isSavingImage) return;
    setIsSavingImage(true);
    setError(null);

    try {
      await setVariantImageAction(variant.id, assetId);
      setIsPickerOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte spara bild');
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleRemoveImage = async (assetId: string) => {
    if (isRemovingImage) return;
    setIsRemovingImage(true);
    setError(null);
    try {
      await removeVariantImageAction(variant.id, assetId);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort bild');
    } finally {
      setIsRemovingImage(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Activation status banner */}
      <ActivationStatusBanner variant={variant} />

      {/* Error messages */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <div className="font-semibold">Fel</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {/* Single image preview */}
      {primaryImage ? (
        <div className="flex items-start gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryImage.url}
              alt={primaryImage.alt ?? 'Variantbild'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Primärbild
            </span>
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              disabled={isSavingImage || isRemovingImage}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {isSavingImage ? 'Sparar…' : 'Ersätt bild'}
            </button>
            <button
              type="button"
              onClick={() => handleRemoveImage(primaryImage.id)}
              disabled={isSavingImage || isRemovingImage}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {isRemovingImage ? 'Tar bort…' : 'Ta bort bild'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">
            Ingen bild
          </div>
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            disabled={isSavingImage || isRemovingImage}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {isSavingImage ? 'Sparar…' : 'Välj bild'}
          </button>
        </div>
      )}

      {/* Active toggle */}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <label className="text-xs font-medium text-slate-700">Status</label>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isLoadingToggle || activationStatus.status === 'blocked'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            variant.active ? 'bg-emerald-600' : 'bg-slate-300'
          } ${
            activationStatus.status === 'blocked'
              ? 'cursor-not-allowed opacity-50'
              : ''
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              variant.active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs text-slate-600">
          {isLoadingToggle
            ? variant.active
              ? 'Inaktiverar…'
              : 'Aktiverar…'
            : variant.active
              ? 'Aktiv'
              : 'Inaktiv'}
        </span>
        {isActivating && (
          <span className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
              aria-hidden="true"
            />
            Aktiverar…
          </span>
        )}
      </div>

      {/* Media picker — maxSelect=1 means one click confirms immediately */}
      {isPickerOpen && (
        <MediaPickerModal
          onSelect={handlePickerSelect}
          onClose={() => setIsPickerOpen(false)}
          maxSelect={1}
        />
      )}
    </div>
  );
}
