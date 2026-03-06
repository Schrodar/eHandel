/**
 * GET    /api/admin/discounts/[id]  — drive detail + first 50 codes
 * PATCH  /api/admin/discounts/[id]  — update drive fields
 * DELETE /api/admin/discounts/[id]  — delete drive (cascades to codes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscountScope, DiscountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security/origin';

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  const drive = await prisma.discountDrive.findUnique({
    where: { id },
    include: {
      codes: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: { select: { codes: true } },
    },
  });

  if (!drive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(drive);
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

type PatchBody = Partial<{
  name: string;
  scopeType: DiscountScope;
  discountType: DiscountType;
  value: number;
  minOrderValue: number | null;
  active: boolean;
  categoryId: string | null;
  productId: string | null;
  variantId: string | null;
}>;

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate enum values if provided
  if (body.scopeType !== undefined && !Object.values(DiscountScope).includes(body.scopeType)) {
    return NextResponse.json({ error: 'Invalid scopeType' }, { status: 400 });
  }
  if (body.discountType !== undefined && !Object.values(DiscountType).includes(body.discountType)) {
    return NextResponse.json({ error: 'Invalid discountType' }, { status: 400 });
  }
  if (body.value !== undefined && (typeof body.value !== 'number' || body.value < 0)) {
    return NextResponse.json({ error: 'value must be a non-negative number' }, { status: 400 });
  }

  try {
    const updated = await prisma.discountDrive.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.scopeType !== undefined && { scopeType: body.scopeType }),
        ...(body.discountType !== undefined && { discountType: body.discountType }),
        ...(body.value !== undefined && { value: body.value }),
        ...(body.minOrderValue !== undefined && { minOrderValue: body.minOrderValue }),
        ...(body.active !== undefined && { active: body.active }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.productId !== undefined && { productId: body.productId }),
        ...(body.variantId !== undefined && { variantId: body.variantId }),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const csrfReject = assertSameOrigin(req);
  if (csrfReject) return csrfReject;

  const { id } = await params;

  try {
    await prisma.discountDrive.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Drive not found' }, { status: 404 });
  }
}
