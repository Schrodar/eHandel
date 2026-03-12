'use server';

/**
 * Admin order Server Actions.
 *
 * Pipeline: READY_TO_PICK → PICKING → PACKED → SHIPPED
 *
 * Rules:
 *  - All logistics transitions guard that paymentStatus === CAPTURED.
 *  - markShipped delegates to OrderService (creates ORDER_SHIPPED outbox event,
 *    sends email idempotently, stores carrier + tracking).
 *  - updateShipping calls the same service so the email is never re-sent but
 *    carrier/tracking are updated.
 *  - No Klarna actions – this project uses Stripe only.
 */

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { CheckoutOrderStatus, OrderStatus, PaymentStatus } from '@prisma/client';

export type OrderActionResult = {
  ok: boolean;
  message: string;
};

/** Orders in these checkout/payment states can never be fulfilled. */
const BLOCKED_CHECKOUT_STATUSES = new Set<CheckoutOrderStatus>([
  CheckoutOrderStatus.PENDING_PAYMENT,
  CheckoutOrderStatus.CANCELLED,
]);
const BLOCKED_PAYMENT_STATUSES = new Set<PaymentStatus>([
  PaymentStatus.FAILED,
  PaymentStatus.PENDING,
  PaymentStatus.CANCELLED,
]);

function assertFulfillable(order: {
  status: CheckoutOrderStatus;
  paymentStatus: PaymentStatus;
}): string | null {
  if (BLOCKED_CHECKOUT_STATUSES.has(order.status)) {
    return `Ordern kan inte behandlas (status: ${order.status}). Betalningen är inte bekräftad.`;
  }
  if (BLOCKED_PAYMENT_STATUSES.has(order.paymentStatus)) {
    return `Ordern kan inte behandlas (betalning: ${order.paymentStatus}). Betalningen är inte bekräftad.`;
  }
  return null;
}

// ─── startPicking ─────────────────────────────────────────────────────────────

export async function startPicking(
  orderId: string,
): Promise<OrderActionResult> {
  const startedAt = Date.now();
  console.info('[admin/orders/startPicking] start', { orderId });

  console.info('[admin/orders/startPicking] auth:begin', { orderId });
  await requireAdminSession();
  console.info('[admin/orders/startPicking] auth:done', {
    orderId,
    elapsedMs: Date.now() - startedAt,
  });

  console.info('[admin/orders/startPicking] db:findUnique:begin', { orderId });
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true, paymentStatus: true, status: true },
  });
  console.info('[admin/orders/startPicking] db:findUnique:done', {
    orderId,
    found: Boolean(order),
    elapsedMs: Date.now() - startedAt,
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const blocked = assertFulfillable(order);
  if (blocked) return { ok: false, message: blocked };

  if (order.paymentStatus !== PaymentStatus.CAPTURED) {
    return { ok: false, message: 'Betalningen är inte bekräftad (CAPTURED)' };
  }

  const startable = new Set<OrderStatus>([
    OrderStatus.NEW,
    OrderStatus.READY_TO_PICK,
  ]);
  if (!startable.has(order.orderStatus)) {
    return { ok: false, message: 'Ordern kan inte startas för plock' };
  }

  console.info('[admin/orders/startPicking] db:update:begin', {
    orderId,
    nextStatus: OrderStatus.PICKING,
  });

  try {
    // Atomic conditional update – no separate read-then-write, avoids row-lock contention.
    // If another process already moved the order out of startable states the count will be 0.
    const updateResult = await prisma.order.updateMany({
      where: {
        id: orderId,
        orderStatus: { in: [OrderStatus.NEW, OrderStatus.READY_TO_PICK] },
        paymentStatus: PaymentStatus.CAPTURED,
        status: {
          notIn: [
            CheckoutOrderStatus.PENDING_PAYMENT,
            CheckoutOrderStatus.CANCELLED,
          ],
        },
      },
      data: { orderStatus: OrderStatus.PICKING },
    });

    if (updateResult.count === 0) {
      console.info('[admin/orders/startPicking] db:update:no-op', {
        orderId,
        elapsedMs: Date.now() - startedAt,
      });
      return {
        ok: false,
        message: 'Ordern uppdaterades inte (status kan ha ändrats av annan process)',
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[admin/orders/startPicking] db:update:error', {
      orderId,
      elapsedMs: Date.now() - startedAt,
      message,
    });

    if (message.toLowerCase().includes('lock timeout')) {
      return {
        ok: false,
        message: 'Ordern är låst av en annan process. Försök igen om några sekunder.',
      };
    }

    return { ok: false, message: 'Kunde inte starta plock just nu' };
  }

  console.info('[admin/orders/startPicking] db:update:done', {
    orderId,
    elapsedMs: Date.now() - startedAt,
  });

  console.info('[admin/orders/startPicking] revalidate:begin', { orderId });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  console.info('[admin/orders/startPicking] done', {
    orderId,
    elapsedMs: Date.now() - startedAt,
  });
  return { ok: true, message: 'Plockning startad' };
}

// ─── markPacked ───────────────────────────────────────────────────────────────

export async function markPacked(orderId: string): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true, paymentStatus: true, status: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const blocked = assertFulfillable(order);
  if (blocked) return { ok: false, message: blocked };

  if (order.orderStatus !== OrderStatus.PICKING) {
    return { ok: false, message: 'Ordern måste vara i plockläge (PICKING)' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.PACKED },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Plock klart – redo att skickas' };
}

// ─── markShipped ──────────────────────────────────────────────────────────────

/**
 * Marks the order as shipped via OrderService, which:
 *   1. Updates orderStatus=SHIPPED + carrier/tracking in a transaction.
 *   2. Creates an ORDER_SHIPPED outbox event (idempotent via unique key).
 *   3. Runs processOutbox() best-effort → sends shipping email exactly once.
 *
 * Requires orderStatus === PACKED (checked here before hitting the service).
 */
export async function markShipped(params: {
  orderId: string;
  carrier: string;
  tracking: string;
}): Promise<OrderActionResult> {
  await requireAdminSession();

  if (!params.carrier.trim() || !params.tracking.trim()) {
    return { ok: false, message: 'Fraktbolag och spårningsnummer krävs' };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { orderStatus: true, paymentStatus: true, status: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const blocked = assertFulfillable(order);
  if (blocked) return { ok: false, message: blocked };

  if (order.orderStatus !== OrderStatus.PACKED) {
    return {
      ok: false,
      message: 'Ordern måste vara packad (PACKED) för att kunna skickas',
    };
  }

  try {
    const { markShipped: serviceMarkShipped } = await import(
      '@/lib/orders/service'
    );
    await serviceMarkShipped(
      params.orderId,
      params.carrier.trim(),
      params.tracking.trim(),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fel vid märkning som skickad';
    return { ok: false, message: msg };
  }

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Order markerad som skickad – leveransmejl skickas' };
}

// ─── updateShipping ───────────────────────────────────────────────────────────

/**
 * Updates carrier/tracking on an already-SHIPPED order.
 * Delegates to the same service → ORDER_SHIPPED event is NOT re-created
 * (idempotencyKey unique constraint), so the shipping email is NOT re-sent.
 */
export async function updateShipping(params: {
  orderId: string;
  carrier: string;
  tracking: string;
}): Promise<OrderActionResult> {
  await requireAdminSession();

  if (!params.carrier.trim() || !params.tracking.trim()) {
    return { ok: false, message: 'Fraktbolag och spårningsnummer krävs' };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const updatable = new Set<OrderStatus>([
    OrderStatus.SHIPPED,
    OrderStatus.COMPLETED,
  ]);
  if (!updatable.has(order.orderStatus)) {
    return {
      ok: false,
      message: 'Fraktinfo kan bara uppdateras för skickade ordrar',
    };
  }

  try {
    const { markShipped: serviceMarkShipped } = await import(
      '@/lib/orders/service'
    );
    await serviceMarkShipped(
      params.orderId,
      params.carrier.trim(),
      params.tracking.trim(),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Fel vid uppdatering av fraktinfo';
    return { ok: false, message: msg };
  }

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Fraktinfo uppdaterad (inget nytt mejl skickas)' };
}
