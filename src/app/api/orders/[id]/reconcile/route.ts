import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { capturePayment } from '@/lib/orders/service';

/**
 * GET /api/orders/[id]/reconcile?payment_intent=pi_xxx&token=<publicToken>
 *
 * Reconcile fallback – called by the success page immediately after Stripe
 * redirects back. If the webhook already ran this is a no-op (idempotent).
 *
 * token: REQUIRED – must match order.publicToken (anti-enumeration / no PII leak).
 * Always returns 404 on token mismatch.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: orderId } = await params;
    const paymentIntentId = req.nextUrl.searchParams.get('payment_intent');
    const token = req.nextUrl.searchParams.get('token');

    if (!orderId || !paymentIntentId || !token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Fetch order and validate token (anti-enumeration: always 404)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentStatus: true,
        status: true,
        providerPaymentId: true,
        orderNumber: true,
        publicToken: true,
      },
    });

    if (!order || order.publicToken !== token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // If already captured: do NOT call capturePayment() here – it would open
    // a $transaction only to hit a unique-constraint rollback, and can leave
    // an idle-in-transaction lock if the function times out.
    // Fire processOutbox directly for best-effort email retry instead.
    if (order.paymentStatus === PaymentStatus.CAPTURED) {
      console.log(`[Reconcile] Order ${orderId} already CAPTURED – firing outbox directly for email retry`);
      const { processOutbox } = await import('@/lib/outbox/processor');
      processOutbox({ lockedBy: `reconcile-${orderId}` }).catch((e) =>
        console.error('[Reconcile] processOutbox error:', e),
      );
      return NextResponse.json({
        orderId,
        paymentStatus: order.paymentStatus,
        status: order.status,
        reconciled: false,
      });
    }

    // Retrieve PaymentIntent from Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeErr) {
      console.error(`[Reconcile] Failed to retrieve PI ${paymentIntentId}:`, stripeErr);
      return NextResponse.json({ error: 'Could not retrieve PaymentIntent' }, { status: 502 });
    }

    // Verify PI belongs to this order
    const piOrderId = paymentIntent.metadata?.orderId;
    const piOwnsThisOrder =
      piOrderId === orderId ||
      order.providerPaymentId === paymentIntentId;

    if (!piOwnsThisOrder) {
      console.warn(
        `[Reconcile] PI ${paymentIntentId} does not belong to order ${orderId}` +
        ` (metadata.orderId=${piOrderId ?? 'none'}, providerPaymentId=${order.providerPaymentId ?? 'none'})`,
      );
      return NextResponse.json({ error: 'PaymentIntent does not match order' }, { status: 400 });
    }

    if (paymentIntent.status !== 'succeeded') {
      console.log(
        `[Reconcile] PI ${paymentIntentId} status is '${paymentIntent.status}' – not capturing order ${orderId}`,
      );
      return NextResponse.json({
        orderId,
        paymentStatus: order.paymentStatus,
        status: order.status,
        piStatus: paymentIntent.status,
        reconciled: false,
      });
    }

    // PI is succeeded – capture via OrderService (creates outbox event + fires processor)
    try {
      await capturePayment(orderId, paymentIntentId);
    } catch (captureErr) {
      const msg = captureErr instanceof Error ? captureErr.message : String(captureErr);
      console.error(`[Reconcile] capturePayment failed for ${orderId}:`, captureErr);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    console.log(`[Reconcile] ORDER UPDATED: ${orderId} CAPTURED via capturePayment`);

    return NextResponse.json({
      orderId,
      paymentStatus: PaymentStatus.CAPTURED,
      reconciled: true,
    });
  } catch (error) {
    console.error('[Reconcile] Unexpected error:', error);
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 });
  }
}
