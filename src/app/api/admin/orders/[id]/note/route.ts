import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security/origin';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  await requireAdminSession();

  const { id: orderId } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};

  if (typeof body.adminNote === 'string' || body.adminNote === null) {
    updates.adminNote = body.adminNote?.trim() || null;
  }
  if (typeof body.flagged === 'boolean') {
    updates.flagged = body.flagged;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: updates,
    select: { id: true, adminNote: true, flagged: true },
  });

  return NextResponse.json(order);
}
