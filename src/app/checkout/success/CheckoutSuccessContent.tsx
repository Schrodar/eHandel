'use client';

import { useEffect, useRef, useState } from 'react';

type OrderStatus = {
  id: string;
  orderNumber: string;
  total: number;
  paymentStatus: string;
  // NOTE: customerEmail is intentionally NOT returned by the API (no-PII policy)
  createdAt: string;
};

type ReconcileResult = {
  orderId: string;
  paymentStatus: string;
  status: string;
  reconciled?: boolean;
  error?: string;
};

type Phase = 'reconciling' | 'polling' | 'captured' | 'failed' | 'delayed_confirmation' | 'invalid';

type Props = {
  orderId?: string;
  redirectStatus?: string;
  paymentIntent?: string;
  /** Opaque token required by GET /api/orders/:id (no-PII guard). */
  publicToken?: string;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30_000;

function deriveInitialPhase(
  orderId: string | undefined,
  paymentIntent: string | undefined,
  redirectStatus: string | undefined,
): Phase {
  // Need at least an orderId to proceed
  if (!orderId) return 'invalid';
  // Explicit failure from Stripe redirect
  if (redirectStatus && redirectStatus !== 'succeeded') return 'failed';
  // If we have orderId and a success signal, start reconciling even without PI id
  return 'reconciling';
}

export default function CheckoutSuccessContent({
  orderId,
  redirectStatus,
  paymentIntent,
  publicToken,
}: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    deriveInitialPhase(orderId, paymentIntent, redirectStatus),
  );
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    redirectStatus && redirectStatus !== 'succeeded'
      ? 'Betalningen misslyckades eller avbröts.'
      : null,
  );

  const pollStartRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileStarted = useRef(false);

  // Kick off reconcile once on mount (only when phase is 'reconciling')
  useEffect(() => {
    if (phase !== 'reconciling') return;
    if (reconcileStarted.current) return;
    reconcileStarted.current = true;
    void runReconcile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: runs once on mount
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  async function runReconcile() {
    if (!orderId) return;

    // If we have a payment_intent id, try the fast reconcile path first.
    if (paymentIntent) {
      try {
        const res = await fetch(
          `/api/orders/${orderId}/reconcile?payment_intent=${encodeURIComponent(paymentIntent)}&token=${encodeURIComponent(publicToken ?? '')}`,
        );
        const data = (await res.json()) as ReconcileResult;

        if (data.paymentStatus === 'CAPTURED') {
          await fetchFinalOrder();
          return;
        }

        if (!res.ok) {
          console.error('[SuccessPage] Reconcile returned error:', data.error);
        }
      } catch (err) {
        console.error('[SuccessPage] Reconcile request failed:', err);
      }
    }

    // Reconcile not done yet (or no PI id) — start polling
    pollStartRef.current = Date.now();
    setPhase('polling');
    schedulePoll();
  }

  async function fetchFinalOrder() {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}?token=${encodeURIComponent(publicToken ?? '')}`);
      const data = (await res.json()) as OrderStatus;
      setOrder(data);
    } catch {
      // Non-fatal — order summary is cosmetic
    }

    // Clear cart — order is confirmed on the server. Do this regardless of
    // whether the order API call succeeded so the cart is never left stale.
    try {
      localStorage.removeItem('cart:v1');
    } catch {
      // localStorage not available (e.g. incognito quota exceeded) — ignore
    }

    setPhase('captured');
  }

  function schedulePoll() {
    if (!orderId) return;

    const elapsed = Date.now() - pollStartRef.current;
    if (elapsed >= POLL_TIMEOUT_MS) {
      // Don't declare failure — the webhook may still arrive.
      // Show a "delayed confirmation" message instead.
      setPhase('delayed_confirmation');
      return;
    }

    pollTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/orders/${orderId}?token=${encodeURIComponent(publicToken ?? '')}`);
          const data = (await res.json()) as OrderStatus;
          if (data.paymentStatus === 'CAPTURED') {
            setOrder(data);
            setPhase('captured');
            return;
          }
        } catch {
          // keep polling
        }
        schedulePoll();
      })();
    }, POLL_INTERVAL_MS);
  }

  async function handleRetry() {
    if (!orderId || !paymentIntent) return;
    reconcileStarted.current = false;
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPhase('reconciling');
    setErrorMsg(null);
    reconcileStarted.current = true;
    void runReconcile();
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  if (phase === 'invalid') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-slate-600">Ogiltig sida – orderdata saknas.</p>
      </div>
    );
  }

  if (phase === 'reconciling' || phase === 'polling') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
        <p className="font-medium text-slate-700">
          {phase === 'reconciling' ? 'Bekräftar betalning…' : 'Uppdaterar orderstatus…'}
        </p>
        <p className="text-sm text-slate-500">Det brukar ta några sekunder.</p>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-6">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md w-full">
          <p className="font-semibold text-red-900 mb-2">Något gick fel</p>
          <p className="text-sm text-red-700">
            {errorMsg ?? 'Betalningen misslyckades.'}
          </p>
        </div>
        {orderId && paymentIntent && redirectStatus === 'succeeded' && (
          <button
            onClick={() => void handleRetry()}
            className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Försök igen
          </button>
        )}
      </div>
    );
  }

  if (phase === 'delayed_confirmation') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-6">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 max-w-md w-full">
          <p className="font-semibold text-amber-900 mb-2">Betalningen behandlas</p>
          <p className="text-sm text-amber-800">
            Betalningen tar längre tid än väntat. Vi uppdaterar status så snart vi
            fått besked från betalningsleverantören. Du kommer att få ett
            bekräftelsemail när betalningen är godkänd.
          </p>
          {orderId && (
            <p className="mt-3 text-xs text-amber-700">
              Order-id: <span className="font-mono">{orderId}</span>
            </p>
          )}
        </div>
        <a
          href="/shop"
          className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Tillbaka till butiken
        </a>
      </div>
    );
  }

  // phase === 'captured'
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <svg
          className="h-8 w-8 text-emerald-600"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Tack för din beställning!</h1>
        {order?.orderNumber && (
          <p className="text-slate-600">
            Ordernummer:{' '}
            <span className="font-semibold text-slate-900">{order.orderNumber}</span>
          </p>
        )}
        <p className="text-sm text-slate-500">
          En orderbekräftelse skickas till din e-postadress.
        </p>
      </div>

      <a
        href="/shop"
        className="rounded-full border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Fortsätt handla
      </a>
    </div>
  );
}
