import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/adminAuth';
import { listHistoryOrders, getHistoryCalendarMonth } from '@/lib/admin/orderHistoryService';
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
  const page = sp.get('page') ? parseInt(sp.get('page')!, 10) : 1;
  const pageSize = sp.get('pageSize') ? parseInt(sp.get('pageSize')!, 10) : 40;

  // Calendar summary request: ?calendar=1&year=2026&month=3
  if (sp.get('calendar') === '1') {
    const year = parseInt(sp.get('year') ?? String(new Date().getFullYear()), 10);
    const month = parseInt(sp.get('month') ?? String(new Date().getMonth() + 1), 10);
    const days = await getHistoryCalendarMonth(year, month);
    return NextResponse.json({ days });
  }

  const result = await listHistoryOrders({
    query,
    orderStatus: orderStatus ?? undefined,
    paymentStatus: paymentStatus ?? undefined,
    from,
    to,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}
