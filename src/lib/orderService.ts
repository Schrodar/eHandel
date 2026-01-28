import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

export async function generateOrderNumberDb(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const num = String(count + 1).padStart(4, '0');
  return `ORDER-${year}-${num}`;
}

export async function createOrderDb(payload: {
  orderNumber?: string;
  sessionId?: string | null;
  klarnaOrderId?: string | null;
  status: string;
  customer: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    streetAddress?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  };
  items: Array<{
    productId: string;
    variantId?: string | null;
    sku?: string | null;
    quantity: number;
    priceAtPurchaseOre: number;
    vatBasisPoints: number;
  }>;
  totalInclVat: number;
  totalVat: number;
  metadata?: Prisma.InputJsonValue | null;
}) {
  const orderNumber = payload.orderNumber ?? (await generateOrderNumberDb());

  const created = await prisma.order.create({
    data: {
      orderNumber,
      klarnaOrderId: payload.klarnaOrderId ?? undefined,
      sessionId: payload.sessionId ?? undefined,
      status: payload.status,
      customerEmail: payload.customer.email,
      customerFirst: payload.customer.firstName ?? undefined,
      customerLast: payload.customer.lastName ?? undefined,
      customerPhone: payload.customer.phone ?? undefined,
      streetAddress: payload.customer.streetAddress ?? undefined,
      postalCode: payload.customer.postalCode ?? undefined,
      city: payload.customer.city ?? undefined,
      country: payload.customer.country ?? undefined,
      totalInclVat: payload.totalInclVat,
      totalVat: payload.totalVat,
      metadata: payload.metadata ?? undefined,
      items: {
        create: payload.items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId ?? undefined,
          sku: it.sku ?? undefined,
          quantity: it.quantity,
          priceAtPurchaseOre: it.priceAtPurchaseOre,
          vatBasisPoints: it.vatBasisPoints,
        })),
      },
    },
    include: { items: true },
  });

  return created;
}

export async function getOrderBySessionIdDb(sessionId: string) {
  return prisma.order.findFirst({ where: { sessionId }, include: { items: true } });
}

export async function getOrderByKlarnaIdDb(klarnaOrderId: string) {
  return prisma.order.findFirst({ where: { klarnaOrderId }, include: { items: true } });
}

export async function updateOrderStatusDb(orderId: string, status: string) {
  return prisma.order.update({ where: { id: orderId }, data: { status } });
}
