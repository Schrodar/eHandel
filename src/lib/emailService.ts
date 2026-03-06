/**
 * emailService.ts
 *
 * Public API (canonical names used by outbox handlers):
 *   trySendConfirmationEmail(orderId)        → Promise<void>
 *   trySendShippedEmail(orderId, payload)    → Promise<void>
 *
 * Aliases kept for backward compatibility:
 *   sendOrderConfirmationById(orderId)       → same as trySendConfirmationEmail
 *   sendOrderShippedEmailById(orderId)       → same as trySendShippedEmail (no payload)
 *   forceResendOrderConfirmation(id)         → admin re-send (resets lock)
 *   sendOrderConfirmation(order)             → legacy shim
 *
 * Idempotens (DB-level lock):
 *   confirmationEmailSentAt  – order confirmation
 *   shippedEmailSentAt       – shipping notification
 *   updateMany count === 1 → lock acquired → send
 *   updateMany count === 0 → already sent → skip
 *   Resend throws → reset lock to null so next retry can try again
 *
 * Dev email override:
 *   NODE_ENV !== 'production' AND EMAIL_FROM uses Resend test domain
 *   → redirect to DEV_EMAIL. See resend.ts for details.
 */

import { PaymentStatus } from '@prisma/client';
import { prisma } from './prisma';
import { resend, EMAIL_FROM, resolveRecipient } from './resend';
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  buildOrderShippedHtml,
  buildOrderShippedText,
  type EmailOrder,
} from './emailTemplates';
import { siteConfig } from './siteConfig';

// ─── Confirmation email ───────────────────────────────────────────────────────

/**
 * Acquires DB idempotency lock, then sends the order confirmation email.
 * Safe to call multiple times – sends exactly once per order.
 *
 * Canonical name used by the outbox handler. Alias: sendOrderConfirmationById.
 */
export async function trySendConfirmationEmail(orderId: string): Promise<void> {
  // 1. Acquire lock (optimistic update)
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, confirmationEmailSentAt: null },
    data: { confirmationEmailSentAt: new Date() },
  });

  if (count === 0) {
    // Already sent (or flagged) – skip silently
    console.log(`[EmailService] EMAIL CONFIRMATION SKIPPED: ${orderId} already sent`);
    return;
  }

  console.log(`[EmailService] EMAIL CONFIRMATION LOCK ACQUIRED: ${orderId}`);

  // 2. Fetch full order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    // Shouldn't happen but release lock to be safe
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { confirmationEmailSentAt: null },
    });
    console.error(`[EmailService] Order not found after lock: ${orderId}`);
    return;
  }

  // 3. Build template data
  const emailOrder: EmailOrder = {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    currency: order.currency,
    items: order.items.map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  };

  // 4. Send (or dev-fallback)
  try {
    if (!resend) {
      // Dev fallback – no API key configured
      console.log('[EmailService] DEV MODE – no RESEND_API_KEY. Would send to:', order.customerEmail);
      console.log('--- EMAIL TEXT START ---');
      console.log(buildOrderConfirmationText(emailOrder));
      console.log('--- EMAIL TEXT END ---');
      return;
    }

    const { to, devOverride } = resolveRecipient(order.customerEmail);
    if (devOverride) {
      console.log(`[EmailService] DEV OVERRIDE – redirecting confirmation from ${order.customerEmail} to ${to}`);
    }

    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Orderbekräftelse ${order.orderNumber} – ${siteConfig.company.name}`,
      html: buildOrderConfirmationHtml(emailOrder),
      text: buildOrderConfirmationText(emailOrder),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log(`[EmailService] EMAIL CONFIRMATION SENT: ${orderId} → ${to} (${order.orderNumber})`);
  } catch (err) {
    // 5. Release lock on failure so webhook retry / admin can re-send
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { confirmationEmailSentAt: null },
    });
    console.error('[EmailService] EMAIL CONFIRMATION FAILED – lock released:', err)
    throw err; // Let caller decide whether to surface
  }
}

/**
 * Backward-compat alias – prefer trySendConfirmationEmail in new code.
 */
export const sendOrderConfirmationById = trySendConfirmationEmail;

// ─── Admin variant: force re-send ────────────────────────────────────────────

/**
 * Admin-triggered re-send. Resets the lock first so sendOrderConfirmationById
 * will always attempt to send, even if confirmationEmailSentAt was already set.
 */
export async function forceResendOrderConfirmation(orderId: string): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: { confirmationEmailSentAt: null },
  });
  await sendOrderConfirmationById(orderId);
}

// ─── Shipping notification ────────────────────────────────────────────────────

/**
 * Sends the "your order has shipped" email exactly once per order.
 *
 * Canonical name used by the outbox handler. Alias: sendOrderShippedEmailById.
 * The `payload` parameter (carrier/tracking) is accepted for logging but the
 * function always reads the authoritative values from the DB at send time.
 */
export async function trySendShippedEmail(
  orderId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload?: { carrier?: string | null; tracking?: string | null },
): Promise<void> {
  // Guard: fetch order to check payment + status
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerEmail: true,
      customerName: true,
      paymentStatus: true,
      orderStatus: true,
      shippedAt: true,
      shippingCarrier: true,
      shippingTracking: true,
      shippedEmailSentAt: true,
    },
  });

  if (!order) {
    console.warn(`[EmailService] SHIPPED EMAIL SKIPPED: ${orderId} – order not found`);
    return;
  }

  if (order.paymentStatus !== PaymentStatus.CAPTURED) {
    console.warn(
      `[EmailService] SHIPPED EMAIL SKIPPED: ${orderId} – paymentStatus is ${order.paymentStatus} (must be CAPTURED)`,
    );
    return;
  }

  if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'COMPLETED') {
    console.warn(
      `[EmailService] SHIPPED EMAIL SKIPPED: ${orderId} – orderStatus is ${order.orderStatus}`,
    );
    return;
  }

  // 1. Acquire lock (optimistic update)
  const { count } = await prisma.order.updateMany({
    where: { id: orderId, shippedEmailSentAt: null },
    data: { shippedEmailSentAt: new Date() },
  });

  if (count === 0) {
    console.log(`[EmailService] EMAIL SHIPPED SKIPPED: ${orderId} already sent`);
    return;
  }

  console.log(`[EmailService] EMAIL SHIPPED LOCK ACQUIRED: ${orderId}`);

  // 2. Send (or dev-fallback)
  const shippedAt = order.shippedAt ?? new Date();
  try {
    if (!resend) {
      console.log('[EmailService] DEV MODE – no RESEND_API_KEY. Would send shipped email to:', order.customerEmail);
      console.log(buildOrderShippedText({ ...order, shippedAt }));
      return;
    }

    const { to, devOverride } = resolveRecipient(order.customerEmail);
    if (devOverride) {
      console.log(`[EmailService] DEV OVERRIDE – redirecting shipped email from ${order.customerEmail} to ${to}`);
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Din order är på väg – ${order.orderNumber}`,
      html: buildOrderShippedHtml({ ...order, shippedAt }),
      text: buildOrderShippedText({ ...order, shippedAt }),
    });

    if (error) {
      throw new Error(error.message);
    }

    const resendId = data?.id ?? 'n/a';
    console.log(`[EmailService] EMAIL SHIPPED SENT: ${orderId} resendId=${resendId}`);
  } catch (err) {
    // Release lock on failure so the ship route / admin can retry
    await prisma.order.updateMany({
      where: { id: orderId },
      data: { shippedEmailSentAt: null },
    });
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] EMAIL SHIPPED FAILED: ${orderId} error=${errMsg}`);
    throw err;
  }
}

/**
 * Backward-compat alias – prefer trySendShippedEmail in new code.
 */
export const sendOrderShippedEmailById = (orderId: string) => trySendShippedEmail(orderId);

// ─── Legacy shim – kept so existing callers don't break ──────────────────────

type LegacyOrderItem = { name?: string; quantity?: number; price?: number };
type LegacyOrder = {
  id: string | number;
  customer: { email: string; firstName?: string };
  items?: LegacyOrderItem[];
  totalInclVat: number;
};

/**
 * @deprecated Use sendOrderConfirmationById instead.
 * Kept for backwards compatibility only; does NOT send real email.
 */
export async function sendOrderConfirmation(order: LegacyOrder): Promise<boolean> {
  console.warn('[EmailService] sendOrderConfirmation (legacy shim) – use sendOrderConfirmationById.');
  console.log(`[EmailService] Would send to ${order.customer.email}, order ${order.id}`);
  return true;
}
