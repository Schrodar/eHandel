/**
 * POST /api/admin/discounts/[id]/code
 *   — add a single campaign code (UNLIMITED or MAX_USES)
 *
 * Body: {
 *   code: string;           — the exact code string (will be uppercased)
 *   usageType: 'UNLIMITED' | 'MAX_USES';
 *   maxUses?: number;       — required when usageType = MAX_USES
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscountUsageType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security/origin';

type RouteParams = { params: Promise<{ id: string }> };

type AddCodeBody = {
  code: string;
  usageType: DiscountUsageType;
  maxUses?: number;
};

export async function POST(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { id } = await params;

  const drive = await prisma.discountDrive.findUnique({ where: { id } });
  if (!drive) {
    return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
  }

  let body: AddCodeBody;
  try {
    body = (await req.json()) as AddCodeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 3 || code.length > 64) {
    return NextResponse.json({ error: 'code must be 3–64 characters' }, { status: 400 });
  }

  if (
    body.usageType !== DiscountUsageType.UNLIMITED &&
    body.usageType !== DiscountUsageType.MAX_USES
  ) {
    return NextResponse.json(
      { error: 'usageType must be UNLIMITED or MAX_USES for campaign codes' },
      { status: 400 },
    );
  }

  if (body.usageType === DiscountUsageType.MAX_USES) {
    if (!body.maxUses || body.maxUses < 1) {
      return NextResponse.json({ error: 'maxUses must be ≥ 1 for MAX_USES codes' }, { status: 400 });
    }
  }

  try {
    const created = await prisma.discountCode.create({
      data: {
        code,
        driveId: id,
        usageType: body.usageType,
        maxUses: body.usageType === DiscountUsageType.MAX_USES ? body.maxUses : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Code already exists' }, { status: 409 });
  }
}
