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

    if (paymentIntentId) {
      // Try to reuse existing PaymentIntent
      try {
        const existingPI = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (
          existingPI.status !== 'succeeded' &&
          existingPI.status !== 'canceled'
        ) {
          clientSecret = existingPI.client_secret;
          console.log(`[PaymentIntent] Reusing existing PI ${paymentIntentId} for order ${order.id}`);
        } else {
          // Existing PI is done/cancelled – create a fresh one
          paymentIntentId = undefined;
        }
      } catch {
        // PaymentIntent not found or error, create new one
        paymentIntentId = undefined;
      }
    }

    if (!clientSecret) {
      // Create new PaymentIntent with orderId in metadata so the webhook can
      // match it immediately on payment_intent.succeeded.
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
        {
          idempotencyKey: `order_${order.id}`,
        },
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
