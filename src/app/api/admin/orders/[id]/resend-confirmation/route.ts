/**
 * POST /api/admin/orders/[id]/resend-confirmation
 *
 * Admin-only endpoint to (re-)send the order confirmation email.
 * Resets confirmationEmailSentAt so the email is always re-attempted.
 *
 * Returns:
 *   200 { ok: true, message: string }
 *   404 { ok: false, error: "Order not found" }
 *   500 { ok: false, error: string }
 *
 * Auth: relies on the existing admin middleware / session guard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { forceResendOrderConfirmation } from '@/lib/emailService';
import { assertSameOrigin } from '@/lib/security/origin';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { id } = await context.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, orderNumber: true, customerEmail: true },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: 'Order not found' }, { status: 404 });
    }

    await forceResendOrderConfirmation(order.id);

    return NextResponse.json({
      ok: true,
      message: `Orderbekräftelse skickad till ${order.customerEmail} (order ${order.orderNumber})`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Admin] resend-confirmation failed:', err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
