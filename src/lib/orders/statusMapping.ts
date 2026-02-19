import { OrderStatus, PaymentStatus } from '@prisma/client';

/**
 * Maps internal OrderStatus + PaymentStatus to a customer-facing label.
 * NEVER expose internal enum values directly to customers.
 */
export function mapInternalStatusToCustomerLabel(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): string {
  // Payment-based overrides take priority
  if (paymentStatus === PaymentStatus.REFUNDED) return 'Återbetald';
  if (orderStatus === OrderStatus.CANCELLED) return 'Avbruten';

  switch (orderStatus) {
    case OrderStatus.NEW:
      return 'Redo att plockas';
    case OrderStatus.READY_TO_PICK:
      return 'Redo att plockas';
    case OrderStatus.PICKING:
      return 'Plockas på lagret';
    case OrderStatus.PACKED:
      return 'Packad';
    case OrderStatus.SHIPPED:
      return 'Lämnat lagret';
    case OrderStatus.COMPLETED:
      return 'Levererad';
  }
  const _exhaustive: never = orderStatus;
  return _exhaustive;
}

/**
 * The visible timeline steps shown to the customer (in order).
 */
export const TIMELINE_STEPS = [
  'Redo att plockas',
  'Plockas på lagret',
  'Packad',
  'Lämnat lagret',
  'Levererad',
] as const;

export type TimelineStep = (typeof TIMELINE_STEPS)[number];

/**
 * Returns which index (0-based) the current order is at in the timeline.
 * Returns -1 for cancelled/refunded (show alert instead).
 */
export function getProgressIndex(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): number {
  if (
    orderStatus === OrderStatus.CANCELLED ||
    paymentStatus === PaymentStatus.REFUNDED
  ) {
    return -1;
  }

  switch (orderStatus) {
    case OrderStatus.NEW:
    case OrderStatus.READY_TO_PICK:
      return 0;
    case OrderStatus.PICKING:
      return 1;
    case OrderStatus.PACKED:
      return 2;
    case OrderStatus.SHIPPED:
      return 3;
    case OrderStatus.COMPLETED:
      return 4;
  }
  const _exhaustive: never = orderStatus;
  return _exhaustive;
}

/**
 * Returns true if the order is in a terminal negative state.
 */
export function isNegativeState(
  orderStatus: OrderStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return (
    orderStatus === OrderStatus.CANCELLED ||
    paymentStatus === PaymentStatus.REFUNDED
  );
}
