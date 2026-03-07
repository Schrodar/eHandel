'use client';

import { useEffect, useRef, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

/** Max milliseconds to stay in "processing" state before showing a fallback. */
const PROCESSING_TIMEOUT_MS = 16_000;

/**
 * Maps Stripe decline codes and error types to user-friendly Swedish messages.
 */
function mapStripeError(error: { code?: string; decline_code?: string; type?: string; message?: string }): string {
  const code = error.decline_code ?? error.code ?? '';
  const type = error.type ?? '';

  // Specific decline codes
  if (code === 'card_declined') {
    return 'Betalningen gick tyvärr inte igenom. Kontrollera dina uppgifter eller prova ett annat kort.';
  }
  if (code === 'insufficient_funds') {
    return 'Otillräckligt saldo. Prova ett annat kort eller betalmetod.';
  }
  if (code === 'lost_card' || code === 'stolen_card' || code === 'fraudulent') {
    return 'Betalningen kunde inte genomföras. Prova ett annat kort eller betalmetod.';
  }
  if (code === 'expired_card') {
    return 'Kortet har gått ut. Kontrollera utgångsdatumet eller prova ett annat kort.';
  }
  if (code === 'incorrect_cvc') {
    return 'Fel CVC-kod. Kontrollera säkerhetskoden på baksidan av kortet.';
  }
  if (code === 'incorrect_number' || code === 'invalid_number') {
    return 'Ogiltigt kortnummer. Kontrollera och försök igen.';
  }
  if (code === 'do_not_honor' || code === 'generic_decline') {
    return 'Kortet nekades av banken. Prova ett annat kort eller kontakta din bank.';
  }
  // Error types
  if (type === 'card_error') {
    return 'Betalningen gick tyvärr inte igenom. Kontrollera dina uppgifter eller prova ett annat kort.';
  }
  if (type === 'validation_error') {
    return error.message ?? 'Kontrollera kortuppgifterna och försök igen.';
  }
  // Generic fallback
  return 'Något gick fel vid betalningen. Försök igen.';
}

type StripeCardPaymentProps = {
  orderId: string;
  publicToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

function PaymentForm({ orderId, publicToken, onSuccess, onError }: StripeCardPaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresAction, setRequiresAction] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anti-freeze guard: if still "processing" after PROCESSING_TIMEOUT_MS,
  // reset the UI and show a fallback message.
  useEffect(() => {
    if (processing) {
      timeoutRef.current = setTimeout(() => {
        setProcessing(false);
        setRequiresAction(false);
        setErrorMessage(
          'Betalningen tar längre tid än väntat. Vi uppdaterar status så snart vi fått besked från betalningsleverantören.',
        );
      }, PROCESSING_TIMEOUT_MS);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [processing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);
    setRequiresAction(false);

    try {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      console.log('[Checkout] confirming payment', { orderId });

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${appUrl}/checkout/success?orderId=${orderId}&public_token=${encodeURIComponent(publicToken)}`,
        },
        // Don't redirect for non-redirect-based payment methods so we can
        // handle requires_action / failure inline.
        redirect: 'if_required',
      });

      console.log('[Checkout] confirm result', result);

      if (result.error) {
        const userMessage = mapStripeError(result.error);
        console.error('[Checkout] confirm error', {
          type: result.error.type,
          code: result.error.code,
          decline_code: result.error.decline_code,
          message: result.error.message,
        });
        setErrorMessage(userMessage);
        onError?.(userMessage);
        setProcessing(false);
        setRequiresAction(false);
      } else if (result.paymentIntent) {
        const pi = result.paymentIntent;
        if (pi.status === 'succeeded') {
          // Payment completed without redirect
          setProcessing(false);
          onSuccess?.();
          // Redirect to success page manually, including payment_intent so the
          // success page can reconcile without polling.
          const appUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
          window.location.assign(
            `${appUrl}/checkout/success?orderId=${orderId}&public_token=${encodeURIComponent(publicToken)}&redirect_status=succeeded&payment_intent=${encodeURIComponent(pi.id)}`,
          );
        } else if (pi.status === 'requires_action') {
          // 3DS or other action needed — Stripe SDK handles the challenge UI
          setRequiresAction(true);
          // The SDK will redirect/show modal; this state is transient
        } else {
          // Unexpected status
          const msg = 'Betalningen kunde inte slutföras. Prova igen.';
          setErrorMessage(msg);
          onError?.(msg);
          setProcessing(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Något gick fel vid betalningen. Försök igen.';
      setErrorMessage(message);
      onError?.(message);
      setProcessing(false);
      setRequiresAction(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {requiresAction && !errorMessage && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-800 font-medium">
            Din bank behöver verifiera köpet.
          </p>
          <p className="text-xs text-blue-600 mt-1">Följ anvisningarna i bankens verifieringsfönster.</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-full py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {processing
          ? requiresAction
            ? 'Väntar på bankverifiering…'
            : 'Behandlar betalningen…'
          : errorMessage
            ? 'Försök igen'
            : 'Betala nu'}
      </button>
    </form>
  );
}

export function StripeCardPayment({ orderId, publicToken, onSuccess, onError }: StripeCardPaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guard: prevent double-fetch in React Strict Mode / multiple renders
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!orderId) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchClientSecret() {
      try {
        console.log('[Checkout] Fetching clientSecret', { orderId });
        const res = await fetch('/api/stripe/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        });

        if (!res.ok) {
          throw new Error('Could not create payment intent');
        }

        const data = (await res.json()) as { clientSecret?: string; error?: string };

        if (!data.clientSecret) {
          throw new Error(data.error || 'Missing client secret');
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Kunde inte förbereda betalning. Försök igen.';
        setError(message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    }

    void fetchClientSecret();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchedRef guard makes orderId/onError safe
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Förbereder betalning...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm text-red-700">{error || 'Kunde inte förbereda betalning'}</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#059669',
            borderRadius: '16px',
          },
        },
      }}
    >
      <PaymentForm orderId={orderId} publicToken={publicToken} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}

