/**
 * src/lib/orders/service.ts
 *
 * Single source of truth for order state transitions.
 * All routes (webhook, reconcile, admin ship) must call these functions
 * instead of updating the Order table directly.
 *
 * Each function:
 *   1. Runs the DB changes + OrderEvent creation in ONE Prisma transaction
 *      (outbox guarantee: either both persist or neither does).
 *   2. After the transaction succeeds, runs processOutbox() best-effort so
 *      the email fires immediately in the happy path.
 *
 * idempotencyKey design:
 *   `${orderId}:ORDER_PAID`    – only one payment capture event per order
 *   `${orderId}:ORDER_SHIPPED` – only one shipped event per order
 *   If the key already exists (Prisma unique constraint violation), the
 *   transaction is silently skipped – the order is already in the right state.
 */

import { PaymentStatus, CheckoutOrderStatus, OrderStatus, OrderEventType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { processOutbox } from '@/lib/outbox/processor';

// ─── capturePayment ───────────────────────────────────────────────────────────

export type CapturePaymentResult = {
  orderId: string;
  alreadyCaptured: boolean;
};

/**
 * Atomically:
 *   - updates Order to paymentStatus=CAPTURED, status=CAPTURED, orderStatus=READY_TO_PICK
 *   - creates OrderEvent(ORDER_PAID) with idempotencyKey `{orderId}:ORDER_PAID`
 *
 * Idempotent: if the order is already CAPTURED (or the idempotencyKey exists),
 * this is a no-op and returns { alreadyCaptured: true }.
 *
 * After the transaction: runs processOutbox() best-effort (non-throwing).
 */
export async function capturePayment(
  orderId: string,
  providerPaymentId: string,
): Promise<CapturePaymentResult> {
  const idempotencyKey = `${orderId}:ORDER_PAID`;

  // ── Fast-path: pre-check OUTSIDE the transaction ─────────────────────────
  // If the order is already captured AND the outbox event already exists there
  // is nothing to write. Opening a $transaction only to hit a unique-constraint
  // rollback wastes a DB connection and can leave an idle-in-transaction lock
  // if the Netlify function times out before ROLLBACK is issued.
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true, authorizedAt: true },
  });

  if (!existing) throw new Error(`Order not found: ${orderId}`);

  if (existing.paymentStatus === PaymentStatus.CAPTURED) {
    console.log(`[OrderService] capturePayment: order already CAPTURED – skipping transaction for ${orderId}`);
    // Fire outbox best-effort so the confirmation email retries if not sent yet.
    processOutbox({ lockedBy: `capture-replay-${orderId}` }).catch((e) =>
      console.error('[OrderService] processOutbox error on replay:', e),
    );
    return { orderId, alreadyCaptured: true };
  }

  // ── Normal path: order is NOT yet captured → open transaction ────────────
  try {
    await prisma.$transaction(async (tx) => {
      // Re-read inside transaction to guard against concurrent captures.
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, paymentStatus: true, authorizedAt: true },
      });

      if (!order) throw new Error(`Order not found: ${orderId}`);

      if (order.paymentStatus !== PaymentStatus.CAPTURED) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.CAPTURED,
            status: CheckoutOrderStatus.CAPTURED,
            orderStatus: OrderStatus.READY_TO_PICK,
            providerPaymentId,
            authorizedAt: order.authorizedAt ?? new Date(),
            capturedAt: new Date(),
          },
        });
        console.log(`[OrderService] ORDER UPDATED: ${orderId} CAPTURED`);
      }

      // Create outbox event (idempotencyKey unique constraint guards duplicates)
      await tx.orderEvent.create({
        data: {
          type: OrderEventType.ORDER_PAID,
          orderId,
          payload: { providerPaymentId },
          idempotencyKey,
        },
      });
      console.log(`[OrderService] OUTBOX EVENT CREATED: ORDER_PAID ${orderId} ${idempotencyKey}`);
    });
  } catch (err: unknown) {
    // Unique constraint on idempotencyKey → concurrent capture won the race
    if (isUniqueConstraintError(err)) {
      console.log(`[OrderService] capturePayment: idempotencyKey exists – no-op for ${orderId}`);
      return { orderId, alreadyCaptured: true };
    }
    throw err;
  }

  // Best-effort: run outbox right now for fast delivery
  processOutbox({ lockedBy: `capture-${orderId}` }).catch((e) =>
    console.error('[OrderService] processOutbox error after capturePayment:', e),
  );

  return { orderId, alreadyCaptured: false };
}

// ─── markShipped ──────────────────────────────────────────────────────────────

export type MarkShippedResult = {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  shippedAt: Date | null;
  shippingCarrier: string | null;
  shippingTracking: string | null;
};

/**
 * Atomically:
 *   - validates order is CAPTURED and not CANCELLED
 *   - updates Order to orderStatus=SHIPPED, shippedAt, carrier, tracking
 *   - creates OrderEvent(ORDER_SHIPPED) with idempotencyKey `{orderId}:ORDER_SHIPPED`
 *
 * Idempotent: if the idempotencyKey already exists the event creation is skipped
 * (the order might still be updated with new carrier/tracking values).
 *
 * After the transaction: runs processOutbox() best-effort.
 */
export async function markShipped(
  orderId: string,
  carrier?: string | null,
  tracking?: string | null,
): Promise<MarkShippedResult> {
  const idempotencyKey = `${orderId}:ORDER_SHIPPED`;

  // Validate order before opening the transaction
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      paymentStatus: true,
      orderStatus: true,
      shippedAt: true,
    },
  });

  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

  if (order.paymentStatus !== PaymentStatus.CAPTURED) {
    throw Object.assign(
      new Error(`Cannot ship order – paymentStatus is ${order.paymentStatus} (must be CAPTURED)`),
      { statusCode: 422 },
    );
  }

  if (order.orderStatus === OrderStatus.CANCELLED) {
    throw Object.assign(new Error('Cannot ship a cancelled order'), { statusCode: 422 });
  }

  const shippedAt = order.shippedAt ?? new Date();

  let updatedOrder: MarkShippedResult;

  try {
    updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: OrderStatus.SHIPPED,
          shippedAt,
          ...(carrier !== undefined ? { shippingCarrier: carrier } : {}),
          ...(tracking !== undefined ? { shippingTracking: tracking } : {}),
        },
        select: {
          id: true,
          orderNumber: true,
          orderStatus: true,
          shippedAt: true,
          shippingCarrier: true,
          shippingTracking: true,
        },
      });

      console.log(
        `[OrderService] SHIP MARKED: ${orderId} carrier=${carrier ?? 'none'} tracking=${tracking ?? 'none'}`,
      );

      // Create outbox event. If already exists (idempotencyKey clash), skip event creation
      // but still commit the order update (carrier/tracking may have changed).
      try {
        await tx.orderEvent.create({
          data: {
            type: OrderEventType.ORDER_SHIPPED,
            orderId,
            payload: { carrier: carrier ?? null, tracking: tracking ?? null },
            idempotencyKey,
          },
        });
        console.log(`[OrderService] OUTBOX EVENT CREATED: ORDER_SHIPPED ${orderId} ${idempotencyKey}`);
      } catch (innerErr: unknown) {
        if (isUniqueConstraintError(innerErr)) {
          console.log(`[OrderService] markShipped: ORDER_SHIPPED event already exists – email will not re-send`);
        } else {
          throw innerErr;
        }
      }

      return {
        orderId: updated.id,
        orderNumber: updated.orderNumber,
        orderStatus: updated.orderStatus,
        shippedAt: updated.shippedAt,
        shippingCarrier: updated.shippingCarrier,
        shippingTracking: updated.shippingTracking,
      };
    });
  } catch (err) {
    throw err;
  }

  // Best-effort: run outbox right now for fast delivery
  processOutbox({ lockedBy: `ship-${orderId}` }).catch((e) =>
    console.error('[OrderService] processOutbox error after markShipped:', e),
  );

  return updatedOrder;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isUniqueConstraintError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const code = (err as Record<string, unknown>)['code'];
  // Prisma unique constraint violation code
  return code === 'P2002';
}
