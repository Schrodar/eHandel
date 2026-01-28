import { NextResponse } from 'next/server';
import { getOrderMock } from '@/lib/klarnaMock';
import { getOrderByKlarnaIdDb, getOrderBySessionIdDb, updateOrderStatusDb } from '@/lib/orderService';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id') || url.searchParams.get('order_id') || null;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    // Our mock client doesn't support session lookup, try by klarna order id first
    const klarnaOrder = await getOrderMock(sessionId);
    if (!klarnaOrder) {
      // Could not find; try treating sessionId as klarna id in DB
      const dbOrderBySession = await getOrderBySessionIdDb(sessionId);
      if (!dbOrderBySession) {
        console.warn('Klarna push: order not found', sessionId);
        return NextResponse.json({ ok: true });
      }
      // In real life we'd fetch Klarna order with session, here we just toggle status to 'captured'
      await updateOrderStatusDb(dbOrderBySession.id, 'captured');
      return NextResponse.json({ ok: true });
    }

    // Update matching DB order by klarnaOrder.order_id
    const dbOrder = await getOrderByKlarnaIdDb(klarnaOrder.order_id);
    if (!dbOrder) {
      console.warn('Klarna push: no local order for klarna id', klarnaOrder.order_id);
      return NextResponse.json({ ok: true });
    }

    // Update status based on klarnaOrder.status
    await updateOrderStatusDb(dbOrder.id, klarnaOrder.status);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Klarna push error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
