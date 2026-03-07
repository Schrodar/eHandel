'use client';

import { useState } from 'react';

type CompareResult = {
  result: 'found' | 'not_found' | 'missing_contact' | null;
  label: string;
  matchedOrder?: {
    id: string;
    orderNumber: string;
    createdAt: string;
    total: number;
    currency: string;
  };
};

export function CompareButton({ orderId }: { orderId: string }) {
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const [result, setResult] = useState<CompareResult | null>(null);

  async function handleCompare() {
    setState('loading');
    try {
      const res = await fetch(`/api/orders/compare?orderId=${encodeURIComponent(orderId)}`);
      const data = (await res.json()) as CompareResult;
      setResult(data);
    } catch {
      setResult({ result: null, label: 'Fel vid jämförelse' });
    } finally {
      setState('idle');
    }
  }

  if (result) {
    const color =
      result.result === 'found'
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
        : result.result === 'not_found'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : 'text-slate-500 bg-slate-50 border-slate-200';

    return (
      <div className={`rounded-lg border px-2 py-1 text-xs font-medium ${color}`}>
        {result.label}
        {result.matchedOrder && (
          <div className="mt-0.5 text-[11px] opacity-80">
            → {result.matchedOrder.orderNumber}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => void handleCompare()}
      disabled={state === 'loading'}
      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
    >
      {state === 'loading' ? '...' : 'Jämför'}
    </button>
  );
}
