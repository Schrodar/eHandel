'use client';

import { useEffect, useRef, useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      console.log('[Checkout] confirming payment', { orderId });

      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${appUrl}/checkout/success?orderId=${orderId}&public_token=${encodeURIComponent(publicToken)}`,
        },
      });

      console.log('[Checkout] confirm result', result);

      if (result.error) {
        console.error('[Checkout] confirm error', result.error);
        setErrorMessage(result.error.message || 'Payment failed');
        onError?.(result.error.message || 'Payment failed');
        setProcessing(false);
      } else {
        // Payment succeeded - will redirect to success page
        onSuccess?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setErrorMessage(message);
      onError?.(message);
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
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
        {processing ? 'Behandlar betalning...' : 'Betala nu'}
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
        const message = err instanceof Error ? err.message : 'Failed to initialize payment';
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
