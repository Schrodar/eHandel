import 'server-only';

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 20;

export type OrderListFilters = {
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  from?: Date;
  to?: Date;
  query?: string;
  page?: number;
  pageSize?: number;
};

export function normalizePage(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function normalizePageSize(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.max(5, Math.min(100, Math.floor(value)));
}

export async function listOrders(filters: OrderListFilters) {
  const page = normalizePage(filters.page);
  const pageSize = normalizePageSize(filters.pageSize);

  const where: Prisma.OrderWhereInput = {};

  if (filters.paymentStatus) {
    where.paymentStatus = filters.paymentStatus;
  }

  if (filters.orderStatus) {
    where.orderStatus = filters.orderStatus;
  }

  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  const query = filters.query?.trim();
  if (query) {
where.OR = [
  { orderNumber: { contains: query } },
  { id: { contains: query } },
  { customerEmail: { contains: query } },
  { klarnaOrderId: { contains: query } },
];

  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        paymentStatus: true,
        orderStatus: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    pageSize,
  };
}

export async function getOrderById(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
}

const ORDER_STATUS_PUBLIC_SELECT = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentStatus: true,
  createdAt: true,
  shippedAt: true,
  customerName: true,
  shippingCity: true,
  shippingCountry: true,
  shippingCarrier: true,
  shippingTracking: true,
  subtotal: true,
  shipping: true,
  discount: true,
  total: true,
  currency: true,
  items: {
    select: {
      id: true,
      productName: true,
      variantName: true,
      sku: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
    },
  },
} as const;

export type PublicOrder = Awaited<ReturnType<typeof getOrderByPublicToken>>;

/**
 * Fetches an order for the public order-status page.
 *
 * TODO: Replace the `id`-based lookup with a dedicated `publicToken` field
 *       (a cryptographically random token, e.g. cuid2/nanoid) once a migration
 *       adds `publicToken String @unique` to the Order model.
 *       Until then the order cuid is used as the token (not guessable in practice,
 *       but not as safe as a purpose-built token).
 *
 * Dev fallback: token "dev" (or the literal string "dev") returns the latest order.
 */
export async function getOrderByPublicToken(token: string) {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev && (token === 'dev' || !token)) {
    return prisma.order.findFirst({
      orderBy: { createdAt: 'desc' },
      select: ORDER_STATUS_PUBLIC_SELECT,
    });
  }

  // TODO: swap `id` for `publicToken` after adding the field + migration
  return prisma.order.findUnique({
    where: { id: token },
    select: ORDER_STATUS_PUBLIC_SELECT,
  });
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.order.count();
  const num = String(count + 1).padStart(4, '0');
  return `ORDER-${year}-${num}`;
}

export async function createTestOrder() {
  const orderNumber = await generateOrderNumber();

  const subtotal = 59000;
  const shipping = 4900;
  const discount = 0;
  const tax = 11800;
  const total = subtotal + shipping - discount;

  return prisma.order.create({
    data: {
      orderNumber,
      paymentProvider: PaymentProvider.KLARNA,
      paymentStatus: PaymentStatus.AUTHORIZED,
      orderStatus: OrderStatus.READY_TO_PICK,
      klarnaOrderId: `mock-${Date.now()}`,
      customerEmail: 'warehouse.demo@example.com',
      customerName: 'Demo Lager',
      customerPhone: '0701234567',
      shippingAddressLine1: 'Testgatan 1',
      shippingPostalCode: '11122',
      shippingCity: 'Stockholm',
      shippingCountry: 'SE',
      billingAddressLine1: 'Testgatan 1',
      billingPostalCode: '11122',
      billingCity: 'Stockholm',
      billingCountry: 'SE',
      subtotal,
      shipping,
      discount,
      tax,
      total,
      currency: 'SEK',
      items: {
        create: [
          {
            productId: 'demo-product-1',
            variantId: 'demo-variant-1',
            productName: 'Testtröja',
            variantName: 'M / Svart',
            sku: 'SKU-DEMO-001',
            quantity: 1,
            unitPrice: 35000,
            lineTotal: 35000,
          },
          {
            productId: 'demo-product-2',
            variantId: 'demo-variant-2',
            productName: 'Testbyxor',
            variantName: 'L / Grå',
            sku: 'SKU-DEMO-002',
            quantity: 1,
            unitPrice: 24000,
            lineTotal: 24000,
          },
        ],
      },
    },
  });
}
