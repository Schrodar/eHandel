'use client';

import { useState } from 'react';
import { getActivationStatus, getPrimaryImage } from '@/lib/mediaPolicy';
import ActivationStatusBanner from './ActivationStatusBanner';

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
import {
  toggleVariantActive,
  addVariantImageAction,
  removeVariantImageAction,
  setVariantImagePrimaryAction,
  reorderVariantImagesAction,
} from '@/app/admin/(protected)/media/actions';
import MediaPickerModal from './MediaPickerModal';

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
  const [error, setError] = useState<string | null>(null);

  const primaryImage = getPrimaryImage(variant);
  const activationStatus = getActivationStatus(variant);
  const isActivating = isLoadingToggle && !variant.active;
  const sortedImages = [...(variant.variantImages || [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const handleToggleActive = async () => {
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

  const handleRemoveImage = async (assetId: string) => {
    try {
      await removeVariantImageAction(variant.id, assetId);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte ta bort bild');
    }
  };

  const handleSetPrimary = async (assetId: string) => {
    try {
      await setVariantImagePrimaryAction(variant.id, assetId);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Kunde inte sätta som primär',
      );
    }
  };

  const handleReorderImages = async (newOrder: string[]) => {
    try {
      await reorderVariantImagesAction(variant.id, newOrder);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Kunde inte sortera bilder',
      );
    }
  };

  const handlePickerSelect = async (assetIds: string[]) => {
    try {
      // Lägg till varje bild
      for (const assetId of assetIds) {
        // Kontrollera om den redan finns
        if (!sortedImages.find((vi) => vi.assetId === assetId)) {
          await addVariantImageAction(variant.id, assetId);
        }
      }

      // Om varianten inte har primary och nu läggs två till, sätt första som primary
      if (!primaryImage && assetIds.length > 0) {
        const firstNewAsset = assetIds[0];
        if (firstNewAsset) {
          await setVariantImagePrimaryAction(variant.id, firstNewAsset);
        }
      }

      setIsPickerOpen(false);
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Kunde inte lägga till bilder',
      );
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

      {/* Image grid */}
      {sortedImages.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Bilder ({sortedImages.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {sortedImages.map((variantImage, idx) => (
              <div
                key={variantImage.assetId}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
              >
                {/* Image preview */}
                <div className="aspect-square overflow-hidden bg-slate-100">
                  {variantImage.asset.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={variantImage.asset.url}
                      alt={variantImage.asset.alt || 'Variant image'}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                {/* Badge: Primary */}
                {variantImage.role === 'primary' && (
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white">
                    PRIMARY
                  </div>
                )}

                {/* Hover actions */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-full space-y-1 bg-linear-to-t from-slate-900 to-transparent p-2 text-xs transition-transform group-hover:translate-y-0">
                  {variantImage.role !== 'primary' && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(variantImage.assetId)}
                      className="block w-full rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-800"
                    >
                      Sätt som primär
                    </button>
                  )}
                  {sortedImages.length > 1 && (
                    <>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOrder = sortedImages.map(
                              (img) => img.assetId,
                            );
                            [newOrder[idx], newOrder[idx - 1]] = [
                              newOrder[idx - 1],
                              newOrder[idx],
                            ];
                            handleReorderImages(newOrder);
                          }}
                          className="block w-full rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-800"
                        >
                          ↑ Upp
                        </button>
                      )}
                      {idx < sortedImages.length - 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOrder = sortedImages.map(
                              (img) => img.assetId,
                            );
                            [newOrder[idx], newOrder[idx + 1]] = [
                              newOrder[idx + 1],
                              newOrder[idx],
                            ];
                            handleReorderImages(newOrder);
                          }}
                          className="block w-full rounded bg-slate-700 px-2 py-1 text-white hover:bg-slate-800"
                        >
                          ↓ Ner
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(variantImage.assetId)}
                    className="block w-full rounded bg-rose-600 px-2 py-1 text-white hover:bg-rose-700"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add image buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
        >
          Välj från bildgalleri
        </button>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
        <label className="text-xs font-medium text-slate-700">Status</label>
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={isLoadingToggle || activationStatus.status === 'blocked'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            variant.active ? 'bg-emerald-600' : 'bg-slate-300'
          } ${activationStatus.status === 'blocked' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              variant.active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs text-slate-600">
          {variant.active ? 'Aktiv' : 'Inaktiv'}
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

      {/* Media picker modal */}
      {isPickerOpen && (
        <MediaPickerModal
          onSelect={handlePickerSelect}
          onClose={() => setIsPickerOpen(false)}
          excludeAssetIds={sortedImages.map((vi) => vi.assetId)}
        />
      )}
    </div>
  );
}
