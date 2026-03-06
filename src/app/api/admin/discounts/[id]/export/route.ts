/**
 * GET /api/admin/discounts/[id]/export
 *   — export all codes for a drive as CSV
 *
 * Returns: text/csv  attachment: discount-codes-{driveId}.csv
 *
 * CSV columns:
 *   code, drive, discountType, value, usageType, maxUses, usedCount, usedAt
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = { params: Promise<{ id: string }> };

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { id } = await params;

  const drive = await prisma.discountDrive.findUnique({
    where: { id },
    include: {
      codes: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!drive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const header = 'code,drive,discountType,value,usageType,maxUses,usedCount,usedAt\n';

  const rows = drive.codes
    .map((c) =>
      [
        escapeCSV(c.code),
        escapeCSV(drive.name),
        escapeCSV(drive.discountType),
        escapeCSV(drive.value),
        escapeCSV(c.usageType),
        escapeCSV(c.maxUses),
        escapeCSV(c.usedCount),
        escapeCSV(c.usedAt?.toISOString() ?? ''),
      ].join(','),
    )
    .join('\n');

  const csv = header + rows;
  const filename = `discount-codes-${id}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
