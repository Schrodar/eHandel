import { Suspense } from 'react';
import type Stripe from 'stripe';
import CheckoutSuccessContent from './CheckoutSuccessContent';
import { stripe } from '@/lib/stripe';

type PageSearchParams = Promise<Record<string, string | undefined>>;

export const metadata = {
  title: 'Orderbekräftelse',
};

// ─── Server-side helpers ──────────────────────────────────────────────────────

type ResolvedParams = {
  orderId: string | undefined;
  paymentIntent: string | undefined;
  redirectStatus: string | undefined;
  publicToken: string | undefined;
  fatalError?: string;
};

/**
 * Retrieves the Checkout Session server-side and derives orderId +
 * paymentIntentId so the client component can start polling immediately.
 *
 * Stripe only redirects to success_url when payment_status === 'paid',
 * so we can treat that as the "succeeded" signal.
 */
async function resolveFromSessionId(sessionId: string): Promise<ResolvedParams> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const orderId =
      session.metadata?.orderId ||
      session.client_reference_id ||
      undefined;

    // publicToken is stored in session metadata at checkout creation time
    const publicToken = session.metadata?.publicToken ?? undefined;

    if (!orderId) {
      console.error('[SuccessPage] Session found but no orderId in metadata or client_reference_id', sessionId);
      return {
        orderId: undefined,
        paymentIntent: undefined,
        redirectStatus: undefined,
        publicToken: undefined,
        fatalError: 'Kunde inte hitta orderinformation för denna session.',
      };
    }

    // payment_intent is string | Stripe.PaymentIntent | null depending on whether
    // the expand actually resolved (can be string id if expand was silently skipped).
    const rawPi = session.payment_intent;
    const piObject: Stripe.PaymentIntent | null =
      rawPi !== null && typeof rawPi === 'object' ? (rawPi as Stripe.PaymentIntent) : null;
    const paymentIntentId: string | undefined =
      typeof rawPi === 'string' ? rawPi : piObject?.id ?? undefined;

    // Treat the session as succeeded when:
    //   a) session.payment_status === 'paid'  (primary — set by Stripe Checkout)
    //   b) the expanded PI status === 'succeeded' (secondary — handles edge cases
    //      where payment_status update lags behind the PI update)
    const isSucceeded =
      session.payment_status === 'paid' ||
      piObject?.status === 'succeeded';
    const redirectStatus = isSucceeded ? 'succeeded' : 'pending';

    return { orderId, paymentIntent: paymentIntentId, redirectStatus, publicToken };
  } catch (err) {
    console.error('[SuccessPage] Failed to retrieve Stripe session:', err);
    // fatalError path (no orderId/publicToken)
    return {
      orderId: undefined,
      paymentIntent: undefined,
      redirectStatus: undefined,
      publicToken: undefined,
      fatalError: 'Kunde inte hämta betalningsinformation. Kontakta oss om du inte fått en orderbekräftelse.',
    };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;

  let resolved: ResolvedParams;

  if (params.session_id) {
    // Primary path: Stripe Checkout redirect with ?session_id=
    resolved = await resolveFromSessionId(params.session_id);
  } else {
    // Legacy / Payment Element path: direct query params
    resolved = {
      orderId: params.orderId,
      paymentIntent: params.payment_intent,
      redirectStatus: params.redirect_status,
      publicToken: params.public_token,
    };
  }

  if (resolved.fatalError) {
    return (
      <main className="mx-auto max-w-2xl py-16 px-4">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-4">
          <div className="rounded-2xl bg-red-50 border border-red-200 p-6 max-w-md w-full">
            <p className="font-semibold text-red-900 mb-2">Något gick fel</p>
            <p className="text-sm text-red-700">{resolved.fatalError}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl py-16 px-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
            <p className="font-medium text-slate-700">Bekräftar betalning…</p>
          </div>
        }
      >
        <CheckoutSuccessContent
          orderId={resolved.orderId}
          redirectStatus={resolved.redirectStatus}
          paymentIntent={resolved.paymentIntent}
          publicToken={resolved.publicToken}
        />
      </Suspense>
    </main>
  );
}

