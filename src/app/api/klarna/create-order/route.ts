import { NextResponse } from 'next/server';
import { createOrderMock } from '@/lib/klarnaMock';
import { createOrderDb } from '@/lib/orderService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const authorization_token = (body.authorization_token as string) || null;
    const session_id = (body.session_id as string) || null;
    const billing = body.billing;
    type LineItemInput = {
      reference: string | null;
      name: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
      tax_rate?: number;
      merchant_data?: string;
    };

    const line_items = (body.line_items as LineItemInput[]) ?? [];
    const order_amount = Number(body.order_amount ?? 0);
    const order_tax_amount = Number(body.order_tax_amount ?? 0);

    if (!authorization_token || !session_id || !billing || !Array.isArray(line_items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Call mock Klarna to create an order
    const klarnaOrder = await createOrderMock(authorization_token, {
      order_lines: line_items.map((li) => ({
        reference: li.reference,
        name: li.name,
        quantity: li.quantity,
        unit_price: li.unit_price,
        total_amount: li.total_amount,
        tax_rate: li.tax_rate ?? 2500,
      })),
      order_amount,
      billing: { email: billing.email, given_name: billing.firstName, family_name: billing.lastName, phone: billing.phone },
    });

    // Persist order in DB
    const dbOrder = await createOrderDb({
      sessionId: session_id,
      klarnaOrderId: klarnaOrder.order_id,
      status: klarnaOrder.status,
      customer: {
        email: klarnaOrder.billing_address.email,
        firstName: klarnaOrder.billing_address.given_name ?? null,
        lastName: klarnaOrder.billing_address.family_name ?? null,
        phone: klarnaOrder.billing_address.phone ?? null,
      },
      items: line_items.map((li) => ({
        productId: li.merchant_data ? JSON.parse(li.merchant_data).productId : li.reference ?? 'unknown',
        variantId: li.merchant_data ? JSON.parse(li.merchant_data).variantId : null,
        sku: li.reference ?? null,
        quantity: Number(li.quantity),
        priceAtPurchaseOre: Number(li.unit_price),
        vatBasisPoints: Number(li.tax_rate ?? 2500),
      })),
      totalInclVat: order_amount,
      totalVat: order_tax_amount,
    });

    return NextResponse.json({ order_id: dbOrder.id, klarna_order_id: klarnaOrder.order_id, confirmation_url: `/checkout/confirmation?order_id=${dbOrder.id}` });
  } catch (err) {
    console.error('create-order error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
