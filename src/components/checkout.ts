/**
 * CHECKOUT TYPES
 *
 * Definitioner för checkout-processen.
 * Säkerställer att data skickas korrekt till server.
 */

import type { CartItem } from '@/hooks/useCart';

/**
 * Kunduppgifter som krävs vid checkout
 */
export type CustomerInfo = {
  /** E-postadress (KRÄVS) */
  email: string;
  /** Telefonnummer (valfritt initialt) */
  phone?: string;
  /** Förnamn (KRÄVS) */
  firstName: string;
  /** Efternamn (KRÄVS) */
  lastName: string;
  /** Gatuadress (KRÄVS) */
  streetAddress: string;
  /** Postnummer (KRÄVS) */
  postalCode: string;
  /** Stad (KRÄVS) */
  city: string;
  /** Land - låst till SE initialt */
  country: 'SE';
};

/**
 * Orderrad - vad klienten skickar till server
 * VIKTIGT: Innehåller ALDRIG pris, endast produkt-ID och antal
 */
export type OrderItem = {
  variantId: string;
  sku: string;
  productName: string;
  variantLabel?: string;
  unit_price: number; // öre
  quantity: number;
  tax_rate: number; // basis points
  image_url?: string;
  product_url?: string;
};

/**
 * Checkout-request som skickas till server
 */
export type CheckoutRequest = {
  items: OrderItem[];
  customer: CustomerInfo;
  // client-side totals (optional) to help display — server recalculates
  client_total_amount?: number; // öre
  client_total_tax_amount?: number; // öre
};

/**
 * Validera att checkout-data är korrekt
 */

export function validateCheckoutRequest(request: CheckoutRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.items || request.items.length === 0) {
    errors.push('Varukorgen är tom');
  }

  let computedTotal = 0;
  let computedTotalTax = 0;

  for (const item of request.items) {
    if (!item.sku) errors.push('SKU saknas på en orderrad');
    if (!Number.isInteger(item.unit_price) || item.unit_price < 0)
      errors.push(`Ogiltigt unit_price för SKU ${item.sku}`);
    if (!Number.isInteger(item.quantity) || item.quantity <= 0)
      errors.push(`Ogiltig quantity för SKU ${item.sku}`);
    if (!Number.isInteger(item.tax_rate) || item.tax_rate < 0)
      errors.push(`Ogiltig tax_rate för SKU ${item.sku}`);

    const lineTotal = item.unit_price * item.quantity; // öre
    // compute ex-vat: rounded integer division
    const divisor = 10000 + item.tax_rate;
    const lineExVat = Math.round((lineTotal * 10000) / divisor);
    const lineTax = lineTotal - lineExVat;

    computedTotal += lineTotal;
    computedTotalTax += lineTax;
  }

  // If client supplied totals, ensure they match computed sums
  if (typeof request.client_total_amount === 'number') {
    if (request.client_total_amount !== computedTotal)
      errors.push('Client total_amount mismatch');
  }
  if (typeof request.client_total_tax_amount === 'number') {
    if (request.client_total_tax_amount !== computedTotalTax)
      errors.push('Client total_tax_amount mismatch');
  }

  // Validera kundinfo
  const { customer } = request;
  if (!customer.email || !customer.email.includes('@')) {
    errors.push('Giltig e-postadress krävs');
  }
  if (!customer.firstName || customer.firstName.trim().length === 0) {
    errors.push('Förnamn krävs');
  }
  if (!customer.lastName || customer.lastName.trim().length === 0) {
    errors.push('Efternamn krävs');
  }
  if (!customer.streetAddress || customer.streetAddress.trim().length === 0) {
    errors.push('Adress krävs');
  }
  if (!customer.postalCode || customer.postalCode.trim().length === 0) {
    errors.push('Postnummer krävs');
  }
  if (!customer.city || customer.city.trim().length === 0) {
    errors.push('Stad krävs');
  }
  if (customer.country !== 'SE') {
    errors.push('Endast Sverige stöds för närvarande');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Skapa checkout-request från varukorg
 */
export function createCheckoutRequest(
  cart: Record<string, CartItem> | CartItem[],
  customer: CustomerInfo,
): CheckoutRequest {
  const arr: CartItem[] = Array.isArray(cart) ? cart : Object.values(cart);

  const items: OrderItem[] = arr.map((c) => ({
    variantId: c.variantId,
    sku: c.sku,
    productName: c.productName,
    variantLabel: c.variantLabel,
    unit_price: c.unitPrice,
    quantity: c.quantity,
    tax_rate: c.taxRate,
    image_url: c.imageUrl,
    product_url: c.productUrl,
  }));

  const client_total_amount = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  const client_total_tax_amount = items.reduce((s, it) => {
    const total = it.unit_price * it.quantity;
    const divisor = 10000 + it.tax_rate;
    const exVat = Math.round((total * 10000) / divisor);
    return s + (total - exVat);
  }, 0);

  return {
    items,
    customer,
    client_total_amount,
    client_total_tax_amount,
  };
}
