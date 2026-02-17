'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';
import {
  cancelKlarnaAuthorization,
  captureKlarnaPayment,
  refundKlarnaPayment,
} from '@/lib/klarna/client';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { createTestOrder as createTestOrderRecord } from '@/lib/orders/queries';

export type OrderActionResult = {
  ok: boolean;
  message: string;
};

export async function createTestOrder(_formData?: FormData): Promise<void> {
  await requireAdminSession();
  await createTestOrderRecord();
  revalidatePath('/admin/orders');
}

export async function startPicking(
  orderId: string,
): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const startable = new Set<OrderStatus>([
    OrderStatus.NEW,
    OrderStatus.READY_TO_PICK,
  ]);
  if (!startable.has(order.orderStatus)) {
    return { ok: false, message: 'Ordern kan inte startas för plock' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.PICKING },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Plockning startad' };
}

export async function markPacked(orderId: string): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  if (order.orderStatus !== OrderStatus.PICKING) {
    return { ok: false, message: 'Ordern måste vara i plockläge' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.PACKED },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Plock klart' };
}

export async function undoPacked(orderId: string): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  if (order.orderStatus !== OrderStatus.PACKED) {
    return { ok: false, message: 'Ordern är inte packad' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: OrderStatus.PICKING },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Ordern återställd till plock' };
}

export async function markShipped(params: {
  orderId: string;
  carrier: string;
  tracking: string;
}): Promise<OrderActionResult> {
  await requireAdminSession();

  if (!params.carrier.trim() || !params.tracking.trim()) {
    return { ok: false, message: 'Fraktbolag och tracking krävs' };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  if (order.orderStatus !== OrderStatus.PACKED) {
    return { ok: false, message: 'Ordern måste vara packad' };
  }

  await prisma.order.update({
    where: { id: params.orderId },
    data: {
      orderStatus: OrderStatus.SHIPPED,
      shippedAt: new Date(),
      shippingCarrier: params.carrier.trim(),
      shippingTracking: params.tracking.trim(),
    },
  });

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Markerad som skickad' };
}

export async function undoShipped(orderId: string): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderStatus: true, paymentStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  if (order.orderStatus !== OrderStatus.SHIPPED) {
    return { ok: false, message: 'Ordern är inte skickad' };
  }

  if (order.paymentStatus === PaymentStatus.CAPTURED) {
    return { ok: false, message: 'Kan inte backa skickad efter capture' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      orderStatus: OrderStatus.PACKED,
      shippedAt: null,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Ordern återställd till packad' };
}

export async function updateShipping(params: {
  orderId: string;
  carrier: string;
  tracking: string;
}): Promise<OrderActionResult> {
  await requireAdminSession();

  if (!params.carrier.trim() || !params.tracking.trim()) {
    return { ok: false, message: 'Fraktbolag och tracking krävs' };
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { orderStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  const allowed = new Set<OrderStatus>([
    OrderStatus.PACKED,
    OrderStatus.SHIPPED,
    OrderStatus.COMPLETED,
  ]);
  if (!allowed.has(order.orderStatus)) {
    return { ok: false, message: 'Ordern kan inte uppdatera fraktinfo' };
  }

  await prisma.order.update({
    where: { id: params.orderId },
    data: {
      shippingCarrier: params.carrier.trim(),
      shippingTracking: params.tracking.trim(),
    },
  });

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Fraktinfo uppdaterad' };
}

export async function capturePayment(
  orderId: string,
): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      paymentStatus: true,
      orderStatus: true,
      klarnaOrderId: true,
      total: true,
    },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };

  if (order.orderStatus !== OrderStatus.SHIPPED) {
    return { ok: false, message: 'Ordern måste vara skickad' };
  }

  if (order.paymentStatus !== PaymentStatus.AUTHORIZED) {
    return { ok: false, message: 'Betalningen är inte auktoriserad' };
  }

  if (!order.klarnaOrderId) {
    return { ok: false, message: 'Klarna order-id saknas' };
  }

  const result = await captureKlarnaPayment({
    klarnaOrderId: order.klarnaOrderId,
    amount: order.total,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.error ?? 'Klarna capture misslyckades',
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.CAPTURED,
      capturedAt: new Date(),
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return {
    ok: true,
    message: result.mocked ? 'Klarna capture mockad' : 'Klarna capture klar',
  };
}

export async function cancelAuthorization(
  orderId: string,
): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { klarnaOrderId: true, paymentStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };
  if (order.paymentStatus !== PaymentStatus.AUTHORIZED) {
    return { ok: false, message: 'Betalningen är inte auktoriserad' };
  }
  if (!order.klarnaOrderId) {
    return { ok: false, message: 'Klarna order-id saknas' };
  }

  const result = await cancelKlarnaAuthorization({
    klarnaOrderId: order.klarnaOrderId,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.error ?? 'Klarna cancel misslyckades',
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: PaymentStatus.CANCELLED },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Auktorisering avbruten' };
}

export async function refundPayment(params: {
  orderId: string;
  amount: number;
}): Promise<OrderActionResult> {
  await requireAdminSession();

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: { klarnaOrderId: true, paymentStatus: true },
  });

  if (!order) return { ok: false, message: 'Ordern hittades inte' };
  if (order.paymentStatus !== PaymentStatus.CAPTURED) {
    return { ok: false, message: 'Betalningen är inte capturerad' };
  }
  if (!order.klarnaOrderId) {
    return { ok: false, message: 'Klarna order-id saknas' };
  }

  const result = await refundKlarnaPayment({
    klarnaOrderId: order.klarnaOrderId,
    amount: params.amount,
  });

  if (!result.ok) {
    return { ok: false, message: result.error ?? 'Klarna refund misslyckades' };
  }

  await prisma.order.update({
    where: { id: params.orderId },
    data: { paymentStatus: PaymentStatus.REFUNDED },
  });

  revalidatePath(`/admin/orders/${params.orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Refund klar' };
}
