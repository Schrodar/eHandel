/**
 * GET  /api/admin/discounts/[id]/codes?page=1&pageSize=50
 *   — paginated list of DiscountCodes for a drive
 *
 * POST /api/admin/discounts/[id]/codes
 *   Body: { count: number }  (max 500 per call)
 *   — generates N unique SINGLE_USE codes for the drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { DiscountUsageType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security/origin';

type RouteParams = { params: Promise<{ id: string }> };

/** Generate a readable code like DRIVE-A1B2C3 */
function generateCode(prefix: string): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  const clean = prefix.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
  return clean ? `${clean}-${suffix}` : suffix;
}

// ─── GET — list codes ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;
  const { searchParams } = new URL(req.url);

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));
  const skip = (page - 1) * pageSize;

  const [total, codes] = await Promise.all([
    prisma.discountCode.count({ where: { driveId: id } }),
    prisma.discountCode.findMany({
      where: { driveId: id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, codes });
}

// ─── POST — bulk generate SINGLE_USE codes ────────────────────────────────────

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

  let body: { count?: number };
  try {
    body = (await req.json()) as { count?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const count = Math.min(500, Math.max(1, Math.floor(body.count ?? 1)));

  // Build slug prefix from drive name
  const prefix = drive.name
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6);

  // Generate unique codes — retry on collision up to attempts limit
  const codes: string[] = [];
  const maxAttempts = count * 3;
  let attempts = 0;
  const existing = new Set<string>();

  while (codes.length < count && attempts < maxAttempts) {
    attempts++;
    const candidate = generateCode(prefix);
    if (existing.has(candidate)) continue;
    existing.add(candidate);

    // Check DB uniqueness
    const collision = await prisma.discountCode.findUnique({
      where: { code: candidate },
      select: { code: true },
    });
    if (!collision) {
      codes.push(candidate);
    }
  }

  if (codes.length === 0) {
    return NextResponse.json({ error: 'Failed to generate unique codes' }, { status: 500 });
  }

  const created = await prisma.discountCode.createMany({
    data: codes.map((code) => ({
      code,
      driveId: id,
      usageType: DiscountUsageType.SINGLE_USE,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({ generated: created.count, codes }, { status: 201 });
}
