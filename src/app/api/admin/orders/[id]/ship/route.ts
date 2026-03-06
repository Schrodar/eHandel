/**
 * POST /api/admin/orders/[id]/ship
 *
 * Marks an order as shipped by delegating to the OrderService.markShipped()
 * function which:
 *   1. Validates guards (paymentStatus=CAPTURED, not CANCELLED)
 *   2. Updates order in a Prisma transaction together with an OrderEvent
 *   3. Runs the outbox processor (best-effort) so the email fires immediately
 *
 * Body (all optional):
 *   { shippingCarrier?: string; shippingTracking?: string }
 *
 * Idempotent: a second call updates carrier/tracking if provided, but the
 * shipped email is NOT re-sent (shippedEmailSentAt lock guards it).
 *
 * Auth: middleware.ts protects /api/admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { markShipped } from '@/lib/orders/service';
import { assertSameOrigin } from '@/lib/security/origin';

type RouteContext = { params: Promise<{ id: string }> };

type ShipBody = {
  shippingCarrier?: string | null;
  shippingTracking?: string | null;
};

export async function POST(
  req: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { id } = await context.params;

  let body: ShipBody = {};
  try {
    body = (await req.json()) as ShipBody;
  } catch {
    // body is optional – no JSON is fine
  }

  try {
    const result = await markShipped(id, body.shippingCarrier, body.shippingTracking);
    return NextResponse.json({ ok: true, order: result });
  } catch (err: unknown) {
    const statusCode =
      err != null && typeof err === 'object' && typeof (err as Record<string, unknown>)['statusCode'] === 'number'
        ? (err as Record<string, unknown>)['statusCode'] as number
        : 500;
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Ship] Unexpected error:', err);
    return NextResponse.json({ ok: false, error: message }, { status: statusCode });
  }
}
