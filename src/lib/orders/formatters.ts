import { PaymentStatus, OrderStatus } from '@prisma/client';

export function formatPaymentStatus(status: PaymentStatus): string {
  switch (status) {
    case PaymentStatus.PENDING:
      return 'Väntar';
    case PaymentStatus.AUTHORIZED:
      return 'Reserverad';
    case PaymentStatus.CAPTURED:
      return 'Betald';
    case PaymentStatus.CANCELLED:
      return 'Avbruten';
    case PaymentStatus.REFUNDED:
      return 'Återbetald';
    case PaymentStatus.FAILED:
      return 'Misslyckad';
  }
  const _exhaustive: never = status;
  return _exhaustive;
}

export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.NEW:
      return 'Ny';
    case OrderStatus.READY_TO_PICK:
      return 'Redo att hantera';
    case OrderStatus.PICKING:
      return 'Plockas';
    case OrderStatus.PACKED:
      return 'Packad';
    case OrderStatus.SHIPPED:
      return 'Skickad';
    case OrderStatus.COMPLETED:
      return 'Slutförd';
    case OrderStatus.CANCELLED:
      return 'Avbruten';
  }
  const _exhaustive: never = status;
  return _exhaustive;
}
