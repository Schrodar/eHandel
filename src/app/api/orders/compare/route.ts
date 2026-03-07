import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { PaymentStatus } from '@prisma/client';

/**
 * GET /api/orders/compare?orderId=xxx
 *
 * Admin-only. Read-only analysis tool.
 * Checks if the customer who placed a given incomplete order later completed
 * a successful purchase within the same day or 24 hours.
 *
 * Does NOT modify any order, PaymentIntent, or webhook state.
 */
export async function GET(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      createdAt: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (!order.customerEmail || !order.customerName || !order.customerPhone) {
    return NextResponse.json({
      result: 'missing_contact',
      label: 'Kontaktuppgifter saknas',
    });
  }

  // Look for a successful order by the same email within 24 hours after this order
  const windowEnd = new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000);

  const successfulOrder = await prisma.order.findFirst({
    where: {
      id: { not: orderId },
      customerEmail: order.customerEmail,
      paymentStatus: {
        in: [PaymentStatus.CAPTURED, PaymentStatus.AUTHORIZED],
      },
      createdAt: {
        gt: order.createdAt,
        lte: windowEnd,
      },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      total: true,
      currency: true,
    },
  });

  if (successfulOrder) {
    return NextResponse.json({
      result: 'found',
      label: 'Senare genomförd order hittad',
      matchedOrder: {
        id: successfulOrder.id,
        orderNumber: successfulOrder.orderNumber,
        createdAt: successfulOrder.createdAt,
        total: successfulOrder.total,
        currency: successfulOrder.currency,
      },
    });
  }

  return NextResponse.json({
    result: 'not_found',
    label: 'Ingen lyckad order hittad',
  });
}
