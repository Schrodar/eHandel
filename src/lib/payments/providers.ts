import type { CheckoutPaymentMethod } from '@/lib/payments/types';
import { PAYMENT_PROVIDERS } from '@/lib/payments/types';

export const checkoutPaymentMethods: CheckoutPaymentMethod[] = [
  {
    code: PAYMENT_PROVIDERS.STRIPE,
    label: 'Kort / Swish',
    description: 'Säker betalning via Stripe Checkout.',
    enabled: true,
  },
  {
    code: PAYMENT_PROVIDERS.KLARNA,
    label: 'Klarna',
    description: 'Kommer snart',
    enabled: false,
  },
];
