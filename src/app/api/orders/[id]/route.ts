import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Constant-time string comparison to prevent timing-based token probing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // `token` query param MUST match order.publicToken.
    // Always return 404 on any mismatch to prevent enumeration / PII exposure.
    const token = req.nextUrl.searchParams.get('token');
    if (!id || !token) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentStatus: true,
        status: true,
        publicToken: true,
        createdAt: true,
        // NOTE: customerEmail, customerName, addresses are intentionally excluded
      },
    });

    // Return 404 for both missing order AND token mismatch (anti-enumeration)
    if (!order || !safeEqual(order.publicToken, token)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Strip publicToken from the response — client already has it
    const { publicToken: _tok, ...safeOrder } = order;
    return NextResponse.json(safeOrder);
  } catch {
    // Never expose error details publicly
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
