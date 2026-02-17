import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      order_id?: string;
      klarna_order_id?: string;
    };

    const klarnaOrderId = body.order_id ?? body.klarna_order_id ?? null;
    if (!klarnaOrderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { klarnaOrderId },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ ok: true });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.AUTHORIZED,
        authorizedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Klarna authorize webhook error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
