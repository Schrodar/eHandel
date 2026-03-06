/**
 * GET  /api/admin/discounts   — list all DiscountDrives with summary
 * POST /api/admin/discounts   — create a new DiscountDrive
 *
 * Auth: admin session via middleware.ts + same-origin guard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscountScope, DiscountType, DiscountUsageType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security/origin';

// ─── GET — list drives ────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  const drives = await prisma.discountDrive.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { codes: true } },
    },
  });

  const payload = drives.map((d) => ({
    id: d.id,
    name: d.name,
    scopeType: d.scopeType,
    discountType: d.discountType,
    value: d.value,
    minOrderValue: d.minOrderValue,
    active: d.active,
    codeCount: d._count.codes,
    createdAt: d.createdAt,
    categoryId: d.categoryId,
    productId: d.productId,
    variantId: d.variantId,
  }));

  return NextResponse.json(payload);
}

// ─── POST — create drive ──────────────────────────────────────────────────────

type CreateBody = {
  name: string;
  scopeType: DiscountScope;
  discountType: DiscountType;
  value: number;
  minOrderValue?: number | null;
  active?: boolean;
  categoryId?: string | null;
  productId?: string | null;
  variantId?: string | null;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!Object.values(DiscountScope).includes(body.scopeType)) {
    return NextResponse.json({ error: 'Invalid scopeType' }, { status: 400 });
  }
  if (!Object.values(DiscountType).includes(body.discountType)) {
    return NextResponse.json({ error: 'Invalid discountType' }, { status: 400 });
  }
  if (typeof body.value !== 'number' || body.value < 0) {
    return NextResponse.json({ error: 'value must be a non-negative number' }, { status: 400 });
  }

  const drive = await prisma.discountDrive.create({
    data: {
      name: body.name.trim(),
      scopeType: body.scopeType,
      discountType: body.discountType,
      value: body.value,
      minOrderValue: body.minOrderValue ?? null,
      active: body.active ?? true,
      categoryId: body.categoryId ?? null,
      productId: body.productId ?? null,
      variantId: body.variantId ?? null,
    },
  });

  return NextResponse.json(drive, { status: 201 });
}
