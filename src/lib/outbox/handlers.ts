/**
 * src/lib/outbox/handlers.ts
 *
 * One handler per OrderEventType.
 * Each handler receives the raw OrderEvent row and performs the side-effect
 * (email, webhook call, etc.). Handlers must be idempotent.
 */

import type { OrderEvent } from '@prisma/client';
import { trySendConfirmationEmail, trySendShippedEmail } from '@/lib/emailService';

// ─── Payload shapes ───────────────────────────────────────────────────────────

type OrderPaidPayload = {
  providerPaymentId?: string;
};

type OrderShippedPayload = {
  carrier?: string | null;
  tracking?: string | null;
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function processOrderPaidEvent(event: OrderEvent): Promise<void> {
  console.log(`[OutboxHandler] EVENT PROCESSING ORDER_PAID orderId=${event.orderId}`);
  await trySendConfirmationEmail(event.orderId);
}

export async function processOrderShippedEvent(event: OrderEvent): Promise<void> {
  const payload = (event.payload ?? {}) as OrderShippedPayload;
  console.log(
    `[OutboxHandler] EVENT PROCESSING ORDER_SHIPPED orderId=${event.orderId}` +
    ` carrier=${payload.carrier ?? 'none'} tracking=${payload.tracking ?? 'none'}`,
  );
  await trySendShippedEmail(event.orderId, payload);
}
