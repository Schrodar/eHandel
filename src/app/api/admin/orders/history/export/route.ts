import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { exportHistoryCSV } from '@/lib/admin/orderHistoryService';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  await requireAdminSession();

  const sp = req.nextUrl.searchParams;

  const query = sp.get('q') ?? undefined;
  const orderStatus = sp.get('orderStatus') as OrderStatus | null;
  const paymentStatus = sp.get('paymentStatus') as PaymentStatus | null;
  const from = sp.get('from') ? new Date(sp.get('from')!) : undefined;
  const to = sp.get('to') ? new Date(sp.get('to')!) : undefined;

  const csv = await exportHistoryCSV({
    query,
    orderStatus: orderStatus ?? undefined,
    paymentStatus: paymentStatus ?? undefined,
    from,
    to,
  });

  const filename = `orderhistorik-${new Date().toISOString().substring(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
