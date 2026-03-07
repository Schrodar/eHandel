'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { bulkCreateSizeVariants } from '@/app/admin/(protected)/products/actions';

// ─── Canonical size order ─────────────────────────────────────────────────────
const PRESET_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

export type TemplateVariant = {
  id: string;
  sku: string;
  colorName: string | null;
  priceInCents: number | null;
  productId: string;
};

type SizeEntry = { size: string; stock: number };

type Props = {
  template: TemplateVariant;
};

export function BulkSizeVariantsButton({ template }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-medium text-violet-700 hover:bg-violet-100 transition-colors"
        title="Skapa storleksvarianter från denna variant"
      >
        + Storlekar
      </button>
      {open && (
        <BulkSizeModal
          template={template}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

type ModalProps = {
  template: TemplateVariant;
  onClose: () => void;
};

function BulkSizeModal({ template, onClose }: ModalProps) {
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [bulkStock, setBulkStock] = useState<number>(0);
  const [useBulkStock, setUseBulkStock] = useState(true);
  const [customSize, setCustomSize] = useState('');
  const [extraSizes, setExtraSizes] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [isPending, startTransition] = useTransition();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const allSizes = [...PRESET_SIZES, ...extraSizes];
  const priceLabel = template.priceInCents != null
    ? `${(template.priceInCents / 100).toFixed(0)} kr`
    : '—';

  function toggleSize(size: string) {
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) next.delete(size);
      else next.add(size);
      return next;
    });
  }

  function addCustomSize() {
    const v = customSize.trim().toUpperCase();
    if (!v) return;
    if (allSizes.includes(v)) {
      setSelectedSizes((prev) => new Set([...prev, v]));
    } else {
      setExtraSizes((prev) => [...prev.filter((s) => s !== v), v]);
      setSelectedSizes((prev) => new Set([...prev, v]));
    }
    setCustomSize('');
  }

  function getStock(size: string): number {
    if (useBulkStock) return bulkStock;
    return stocks[size] ?? 0;
  }

  function handleSubmit() {
    if (selectedSizes.size === 0) return;
    const entries = Array.from(selectedSizes).map((size) => ({
      size,
      stock: getStock(size),
    }));

    startTransition(async () => {
      const res = await bulkCreateSizeVariants(template.id, template.productId, entries);
      setResult(res);
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Skapa storleksvarianter</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Varje storlek skapar en separat variant baserad på mallvarianten.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Stäng"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {/* Template info */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Mallvariant
            </div>
            <div className="grid grid-cols-3 gap-2 text-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 font-medium">SKU</div>
                <div className="font-mono mt-0.5">{template.sku}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Färg</div>
                <div className="mt-0.5">{template.colorName ?? '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Pris</div>
                <div className="mt-0.5">{priceLabel}</div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              Färg och pris ärvs. Nya varianter startar som inaktiva.
            </p>
          </div>

          {/* Size chips */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2.5">
              Välj storlekar
            </div>
            <div className="flex flex-wrap gap-2">
              {allSizes.map((size) => {
                const active = selectedSizes.has(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={[
                      'h-9 min-w-[2.75rem] rounded-full px-3.5 text-xs font-medium transition-all duration-100 select-none',
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                    ].join(' ')}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Custom size */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); }}}
                placeholder="Egen storlek, t.ex. 36"
                className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
              <button
                type="button"
                onClick={addCustomSize}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400"
              >
                Lägg till
              </button>
            </div>
          </div>

          {/* Stock inputs */}
          {selectedSizes.size > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Lagersaldo
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBulkStock}
                    onChange={(e) => setUseBulkStock(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs text-slate-600">Samma för alla</span>
                </label>
              </div>

              {useBulkStock ? (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-600 whitespace-nowrap">Lager för alla storlekar:</label>
                  <input
                    type="number"
                    min="0"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(Math.max(0, Number(e.target.value)))}
                    className="w-24 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from(selectedSizes).map((size) => (
                    <div key={size} className="flex items-center gap-2">
                      <span className="w-10 text-center rounded-full border border-slate-200 bg-slate-50 py-0.5 text-xs font-medium text-slate-700">
                        {size}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={stocks[size] ?? 0}
                        onChange={(e) =>
                          setStocks((prev) => ({ ...prev, [size]: Math.max(0, Number(e.target.value)) }))
                        }
                        className="flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className={[
                'rounded-lg border px-4 py-3 text-xs',
                result.errors.length > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900',
              ].join(' ')}
            >
              <div className="font-semibold mb-1">
                {result.created > 0
                  ? `${result.created} variant${result.created > 1 ? 'er' : ''} skapades`
                  : 'Inga varianter skapades'}
                {result.skipped > 0 && ` · ${result.skipped} hoppades över (redan finns)`}
              </div>
              {result.errors.map((e, i) => (
                <div key={i} className="text-amber-800 mt-0.5">{e}</div>
              ))}
              {result.created > 0 && (
                <p className="mt-1 text-emerald-700">Uppdatera sidan för att se de nya varianterna.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {result ? 'Stäng' : 'Avbryt'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedSizes.size === 0 || isPending}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending
                ? 'Skapar…'
                : `Skapa ${selectedSizes.size > 0 ? selectedSizes.size + ' ' : ''}variant${selectedSizes.size !== 1 ? 'er' : ''}`}
            </button>
          )}
          {result && result.created > 0 && (
            <button
              type="button"
              onClick={() => { onClose(); window.location.reload(); }}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              Ladda om sidan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
