import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { orderId?: string };

    if (!body.orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        currency: true,
        paymentStatus: true,
        providerPaymentId: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Reuse existing PaymentIntent if one was already created for this order
    let paymentIntentId = order.providerPaymentId?.startsWith('pi_')
      ? order.providerPaymentId
      : undefined;

    let clientSecret: string | null = null;
    // Tracks whether we need a fresh PI (e.g. after cancellation or for a retry)
    let needsFreshPi = false;

    if (paymentIntentId) {
      // Try to reuse existing PaymentIntent
      try {
        const existingPI = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (
          existingPI.status !== 'succeeded' &&
          existingPI.status !== 'canceled'
        ) {
          // 'requires_payment_method' = previous payment failed; the PI is still
          // reusable — Stripe PaymentElement will prompt for new card details.
          clientSecret = existingPI.client_secret;
          console.log(`[PaymentIntent] Reusing existing PI ${paymentIntentId} (status=${existingPI.status}) for order ${order.id}`);
        } else {
          // PI succeeded (captured already) or was canceled — need a fresh one
          paymentIntentId = undefined;
          needsFreshPi = true;
        }
      } catch {
        // PaymentIntent not found or error, create new one
        paymentIntentId = undefined;
        needsFreshPi = true;
      }
    }

    if (!clientSecret) {
      // Create new PaymentIntent. We intentionally omit the idempotencyKey
      // for retry scenarios (needsFreshPi=true) so Stripe creates a genuine
      // new PI rather than returning the cached canceled one.
      const createOptions = needsFreshPi
        ? {} // no idempotencyKey — retry path
        : { idempotencyKey: `order_${order.id}` }; // first-time creation

      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: order.total, // Amount in öre (cents)
          currency: (order.currency || 'SEK').toLowerCase(),
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        },
        createOptions,
      );

      clientSecret = paymentIntent.client_secret;

      // Persist providerPaymentId early so the webhook fallback-match works
      // even if metadata propagation is delayed.
      await prisma.order.update({
        where: { id: order.id },
        data: { providerPaymentId: paymentIntent.id },
      });

      console.log(`[PaymentIntent] Created new PI ${paymentIntent.id} for order ${order.id}`);
    }

    if (!clientSecret) {
      return NextResponse.json(
        { error: 'Could not create PaymentIntent' },
        { status: 500 },
      );
    }

    return NextResponse.json({ clientSecret });
  } catch (error) {
    console.error('Create PaymentIntent error', error);
    return NextResponse.json(
      { error: 'Could not create PaymentIntent' },
      { status: 500 },
    );
  }
}
