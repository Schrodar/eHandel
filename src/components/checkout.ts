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
 * Produkt-ID i checkoutflödet.
 *
 * För riktiga produkter använder vi produktens ID/slug från databasen.
 */
export type ProductId = string;

/**
 * Orderrad - vad klienten skickar till server
 * VIKTIGT: Innehåller ALDRIG pris, endast produkt-ID och antal
 */
export type OrderItem = {
  /** Produkt-ID (white, black, etc) */
  productId: ProductId;
  /** Antal av denna produkt */
  quantity: number;
};

/**
 * Checkout-request som skickas till server
 */
export type CheckoutRequest = {
  /** Orderrader - endast ID och antal */
  items: OrderItem[];
  /** Kunduppgifter */
  customer: CustomerInfo;
};

/**
 * Validera att checkout-data är korrekt
 */
export function validateCheckoutRequest(request: CheckoutRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validera att vi har items
  if (!request.items || request.items.length === 0) {
    errors.push('Varukorgen är tom');
  }

  // Validera items
  for (const item of request.items) {
    if (!item.productId) {
      errors.push('Produkt-ID saknas');
    }
    if (item.quantity <= 0) {
      errors.push(`Ogiltigt antal för produkt ${item.productId}`);
    }
    // Säkerställ att INGET pris finns
    if ('price' in item || 'priceInOre' in item) {
      errors.push('Pris får ALDRIG skickas från klient!');
    }
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
  cart: Record<ProductId, number>,
  customer: CustomerInfo,
): CheckoutRequest {
  // Konvertera cart till items - ENDAST ID och antal
  const items: OrderItem[] = Object.entries(cart)
    .filter(([_, qty]) => qty > 0)
    .map(([productId, quantity]) => ({
      productId: productId as ProductId,
      quantity,
    }));

  return {
    items,
    customer,
  };
}
