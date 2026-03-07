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
import { markShipped as serviceMarkShipped } from '@/lib/orders/service';

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
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true, paymentStatus: true, status: true },
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

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.PICKING },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
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
