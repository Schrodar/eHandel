import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { PaymentStatus, CheckoutOrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { capturePayment } from '@/lib/orders/service';
import { markDiscountCodeUsed } from '@/lib/discounts/resolve';
import { processOutbox } from '@/lib/outbox/processor';

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }
  return secret;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * Find order using three-tier priority:
 *   1. metadata.orderId  (direct DB id lookup – fastest, most reliable)
 *   2. providerPaymentId (payment_intent.id stored on order)
 *   3. providerOrderId   (session.id stored on order at checkout creation)
 */
async function findOrder(
  orderId: string | undefined,
  paymentIntentId: string | undefined,
  sessionId?: string | undefined,
) {
  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
      console.log(`[Webhook] Matched order ${order.id} via metadata.orderId`);
      return order;
    }
  }
  if (paymentIntentId) {
    const order = await prisma.order.findFirst({
      where: { providerPaymentId: paymentIntentId },
    });
    if (order) {
      console.log(`[Webhook] Matched order ${order.id} via providerPaymentId fallback`);
      return order;
    }
  }
  if (sessionId) {
    const order = await prisma.order.findFirst({
      where: { providerOrderId: sessionId },
    });
    if (order) {
      console.log(`[Webhook] Matched order ${order.id} via providerOrderId (session.id) fallback`);
      return order;
    }
  }
  console.warn(
    `[Webhook] No order found — orderId=${orderId ?? 'none'}, piId=${paymentIntentId ?? 'none'}, sessionId=${sessionId ?? 'none'}`,
  );
  return null;
}

/**
 * Mark order as CAPTURED via OrderService (idempotent) and trigger outbox.
 *
 * Idempotency guarantees:
 *   - capturePayment() uses a DB unique constraint (idempotencyKey) so the
 *     order row and outbox event are written exactly once, even under concurrent
 *     webhook replays.
 *   - When the event already exists (alreadyCaptured=true), we still call
 *     processOutbox() best-effort so the confirmation email fires immediately
 *     on replay if confirmationEmailSentAt is still null.
 *   - Returns true when the order was already captured (caller can short-circuit
 *     any follow-up writes while still returning HTTP 200 to Stripe).
 */
async function captureOrderViaService(
  order: { id: string; paymentStatus: PaymentStatus; authorizedAt: Date | null },
  paymentIntentId: string | undefined,
  _providerOrderId: string | undefined,
): Promise<{ alreadyCaptured: boolean }> {
  console.log(`[Webhook] capture attempt: order=${order.id} pi=${paymentIntentId ?? 'none'}`);

  if (!paymentIntentId) {
    console.warn(`[Webhook] No paymentIntentId for order ${order.id} – cannot capture`);
    return { alreadyCaptured: false };
  }

  try {
    const result = await capturePayment(order.id, paymentIntentId);
    if (result.alreadyCaptured) {
      console.log(`[Webhook] Order ${order.id} already CAPTURED – running processOutbox for email retry`);
      // Best-effort: retry outbox so confirmation email fires if not yet sent
      // (confirmationEmailSentAt IS NULL guard inside the handler ensures exactly-once).
      processOutbox({ lockedBy: `webhook-replay-${order.id}` }).catch((e) =>
        console.error('[Webhook] processOutbox error on replay:', e),
      );
      return { alreadyCaptured: true };
    }
    return { alreadyCaptured: false };
  } catch (err) {
    console.error(`[Webhook] capturePayment failed for order ${order.id}:`, err);
    throw err;
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const piId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  console.log(
    `[Webhook] checkout.session.completed — session=${session.id} piId=${piId ?? 'none'}` +
    ` metadata.orderId=${session.metadata?.orderId ?? 'none'}` +
    ` client_reference_id=${session.client_reference_id ?? 'none'}`,
  );

  const orderId = session.metadata?.orderId || session.client_reference_id || undefined;
  // Pass session.id as 3rd fallback so we can still find the order via providerOrderId
  // even if metadata and client_reference_id are somehow missing.
  const order = await findOrder(orderId, piId, session.id);
  if (!order) return;

  await captureOrderViaService(order, piId, session.id);

  // Mark discount code as used exactly once (idempotent via usedCount guard)
  await markDiscountCodeUsed(order.id, order.appliedDiscountCode);

  // Safety net: ensure providerOrderId and providerPaymentId are persisted.
  // capturePayment() already writes providerPaymentId if the order wasn't
  // previously captured; this update covers the idempotent (already-captured) path.
  const safetyData: Record<string, string> = {};
  if (session.id && !order.providerOrderId) safetyData.providerOrderId = session.id;
  if (piId && !order.providerPaymentId) safetyData.providerPaymentId = piId;
  if (Object.keys(safetyData).length > 0) {
    await prisma.order.update({ where: { id: order.id }, data: safetyData });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    `[Webhook] payment_intent.succeeded — piId=${paymentIntent.id}` +
    ` metadata.orderId=${paymentIntent.metadata?.orderId ?? 'none'}`,
  );

  const orderId = paymentIntent.metadata?.orderId;
  const order = await findOrder(orderId, paymentIntent.id);
  if (!order) return;

  await captureOrderViaService(order, paymentIntent.id, undefined);

  // Mark discount code as used exactly once (idempotent via usedCount guard)
  await markDiscountCodeUsed(order.id, order.appliedDiscountCode);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(
    `[Webhook] payment_intent.payment_failed — piId=${paymentIntent.id}` +
    ` metadata.orderId=${paymentIntent.metadata?.orderId ?? 'none'}`,
  );

  const orderId = paymentIntent.metadata?.orderId;
  const order = await findOrder(orderId, paymentIntent.id);
  if (!order) return;

  if (order.paymentStatus === PaymentStatus.CAPTURED) {
    console.log(`[Webhook] Order ${order.id} already CAPTURED – ignoring failed event`);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: PaymentStatus.FAILED,
      status: CheckoutOrderStatus.CANCELLED,
    },
  });

  console.log(`[Webhook] Order ${order.id} marked as FAILED/CANCELLED`);
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 },
      );
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret());

    // Extract payment-intent id for logging (present on most relevant events)
    const piId = (() => {
      const obj = event.data.object as unknown as Record<string, unknown>;
      if (typeof obj['id'] === 'string' && event.type.startsWith('payment_intent.')) return obj['id'];
      if (typeof obj['payment_intent'] === 'string') return obj['payment_intent'];
      return 'n/a';
    })();
    console.log(`[Webhook] WEBHOOK RECEIVED: ${event.type} ${piId} (event.id=${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'payment_intent.succeeded': {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case 'charge.refunded': {
        // TODO: map refund events to status=REFUNDED when refund flow is enabled.
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Webhook] Error processing event:', error);
    return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
  }
}
