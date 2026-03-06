export const PAYMENT_PROVIDERS = {
  STRIPE: 'STRIPE',
  KLARNA: 'KLARNA',
} as const;

export type PaymentProviderCode =
  (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export type CheckoutPaymentMethod = {
  code: PaymentProviderCode;
  label: string;
  description: string;
  enabled: boolean;
};
