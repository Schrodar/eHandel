import { NextRequest, NextResponse } from 'next/server';
import {
  resolveDiscountForCart,
  buildCartLinesFromVariantIds,
} from '@/lib/discounts/resolve';

type ValidateBody = {
  code: string;
  items: Array<{ variantId: string; quantity: number }>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ValidateBody;

    if (typeof body?.code !== 'string' || !body.code.trim()) {
      return NextResponse.json({ valid: false, reason: 'NOT_FOUND' });
    }

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json({ valid: false, reason: 'NOT_FOUND' });
    }

    // Build server-authoritative cart lines (prices from DB)
    const cartLines = await buildCartLinesFromVariantIds(
      body.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    );

    const result = await resolveDiscountForCart({
      code: body.code,
      cartLines,
      shippingCost: 0, // TODO: pass actual shipping when implemented
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Discounts] validate error:', error);
    // Generic response — never leak internals
    return NextResponse.json({ valid: false, reason: 'NOT_FOUND' });
  }
}
