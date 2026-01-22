/**
 * PRODUKTKATALOG
 *
 * Detta är den enda sanningskällan för produkter och priser.
 * Produkt-IDs är LÅSTA och får ALDRIG ändras.
 *
 * Alla priser lagras i ÖRE (1 kr = 100 öre) för att undvika avrundningsfel.
 * Moms anges i BASIS POINTS (1 bp = 0.01%, så 2500 bp = 25%)
 */

/**
 * Produkt-ID (LÅSTA - ändra ALDRIG dessa)
 */
export type ProductId = 'white' | 'black';

/**
 * Produktdefinition
 */
export type Product = {
  /** Unikt ID - LÅST, får aldrig ändras */
  id: ProductId;
  /** Produktnamn för visning */
  name: string;
  /** Pris i öre (inkl. moms) */
  priceInOre: number;
  /** Momssats i basis points (2500 = 25%) */
  vatBasisPoints: number;
  /** Bild-URL */
  image: string;
  /** Beskrivning */
  description?: string;
};

/**
 * PRODUKTKATALOG
 * Detta är den enda källan för produktdata och priser.
 */
export const PRODUCTS: Readonly<Product[]> = Object.freeze([
  {
    id: 'white',
    name: 'Essential Tee — Vit',
    priceInOre: 39900, // 399 kr
    vatBasisPoints: 2500, // 25%
    image: '/Tvit.png',
    description: 'Minimalist vit t-shirt med premium känsla',
  },
  {
    id: 'black',
    name: 'Essential Tee — Svart',
    priceInOre: 39900, // 399 kr
    vatBasisPoints: 2500, // 25%
    image: '/Tsvart.png',
    description: 'Minimalist svart t-shirt med premium känsla',
  },
] as const);

/**
 * Hämta produkt baserat på ID
 */
export function getProductById(id: ProductId): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/**
 * Beräkna pris exklusive moms
 */
export function calculatePriceExVat(
  priceInclVatOre: number,
  vatBasisPoints: number,
): number {
  const vatMultiplier = 1 + vatBasisPoints / 10000;
  return Math.round(priceInclVatOre / vatMultiplier);
}

/**
 * Beräkna momsbelopp
 */
export function calculateVatAmount(
  priceInclVatOre: number,
  vatBasisPoints: number,
): number {
  const priceExVat = calculatePriceExVat(priceInclVatOre, vatBasisPoints);
  return priceInclVatOre - priceExVat;
}

/**
 * Radbelopp för en produkt
 */
export function calculateLineTotal(
  product: Product,
  quantity: number,
): {
  totalInclVatOre: number;
  totalExVatOre: number;
  vatAmountOre: number;
} {
  const totalInclVatOre = product.priceInOre * quantity;
  const totalExVatOre = calculatePriceExVat(
    totalInclVatOre,
    product.vatBasisPoints,
  );
  const vatAmountOre = totalInclVatOre - totalExVatOre;

  return {
    totalInclVatOre,
    totalExVatOre,
    vatAmountOre,
  };
}

/**
 * Orderbelopp för flera produkter
 */
export function calculateOrderTotal(
  items: Array<{ product: Product; quantity: number }>,
): {
  totalInclVatOre: number;
  totalExVatOre: number;
  totalVatOre: number;
  lineItems: Array<{
    product: Product;
    quantity: number;
    lineTotal: number;
    lineVat: number;
  }>;
} {
  let totalInclVatOre = 0;
  let totalExVatOre = 0;
  let totalVatOre = 0;

  const lineItems = items.map(({ product, quantity }) => {
    const line = calculateLineTotal(product, quantity);
    totalInclVatOre += line.totalInclVatOre;
    totalExVatOre += line.totalExVatOre;
    totalVatOre += line.vatAmountOre;

    return {
      product,
      quantity,
      lineTotal: line.totalInclVatOre,
      lineVat: line.vatAmountOre,
    };
  });

  return {
    totalInclVatOre,
    totalExVatOre,
    totalVatOre,
    lineItems,
  };
}

/**
 * Formatera pris för visning (öre -> kronor)
 */
export function formatPrice(priceInOre: number): string {
  const kr = priceInOre / 100;
  return `${kr.toFixed(0)} kr`;
}

/**
 * Validera att en order är korrekt beräknad
 * Används för att dubbelkolla att klient och server är överens
 */
export function validateOrderTotal(
  items: Array<{ productId: ProductId; quantity: number }>,
  expectedTotalInOre: number,
): { valid: boolean; actualTotalInOre: number; diff: number } {
  const products = items
    .map(({ productId, quantity }) => {
      const product = getProductById(productId);
      return product ? { product, quantity } : null;
    })
    .filter(
      (item): item is { product: Product; quantity: number } => item !== null,
    );

  const { totalInclVatOre: actualTotalInOre } = calculateOrderTotal(products);
  const diff = Math.abs(actualTotalInOre - expectedTotalInOre);

  return {
    valid: diff === 0,
    actualTotalInOre,
    diff,
  };
}
