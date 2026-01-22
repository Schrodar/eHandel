/**
 * IN-MEMORY ORDER STORE
 *
 * Temporär lagring av ordrar för utveckling/testning.
 * I produktion: ersätt med riktig databas.
 */

import type { ProductId } from '@/components/products';
import type { CustomerInfo } from '@/components/checkout';

/**
 * Order status enligt Klarna-flödet
 */
export type OrderStatus =
  | 'created' // Order skapad, väntar på Klarna session
  | 'authorized' // Klarna har auktoriserat betalning
  | 'placed' // Order bekräftad och placerad
  | 'captured' // Betalning dragen
  | 'cancelled' // Order avbruten
  | 'refunded'; // Pengarna återbetalda

/**
 * Order-objekt
 */
export type Order = {
  /** Unikt order-ID (vårt system) */
  id: string;

  /** Klarna order ID */
  klarnaOrderId?: string;

  /** Klarna session ID */
  sessionId?: string;

  /** Order status */
  status: OrderStatus;

  /** Kunduppgifter */
  customer: CustomerInfo;

  /** Orderrader med pris vid köptillfället */
  items: Array<{
    productId: ProductId;
    quantity: number;
    priceAtPurchaseOre: number; // Pris vid köp (kan ändras senare i katalogen)
    vatBasisPoints: number; // Moms vid köp
  }>;

  /** Total inkl. moms (öre) */
  totalInclVatOre: number;

  /** Total moms (öre) */
  totalVatOre: number;

  /** Skapad tidpunkt */
  createdAt: string;

  /** Senast uppdaterad */
  updatedAt?: string;

  /** Metadata */
  metadata?: Record<string, unknown>;
};

/**
 * In-memory order store
 */
class InMemoryOrderStore {
  private orders = new Map<string, Order>();
  private sessionToOrderId = new Map<string, string>();
  private klarnaIdToOrderId = new Map<string, string>();

  /**
   * Skapa ny order
   */
  create(order: Order): Order {
    this.orders.set(order.id, order);

    if (order.sessionId) {
      this.sessionToOrderId.set(order.sessionId, order.id);
    }

    if (order.klarnaOrderId) {
      this.klarnaIdToOrderId.set(order.klarnaOrderId, order.id);
    }

    // Logga till console
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 [ORDER CREATED]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(JSON.stringify(order, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return order;
  }

  /**
   * Hämta order via ID
   */
  get(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Hämta order via Klarna session ID
   */
  getBySessionId(sessionId: string): Order | undefined {
    const orderId = this.sessionToOrderId.get(sessionId);
    return orderId ? this.orders.get(orderId) : undefined;
  }

  /**
   * Hämta order via Klarna order ID
   */
  getByKlarnaId(klarnaOrderId: string): Order | undefined {
    const orderId = this.klarnaIdToOrderId.get(klarnaOrderId);
    return orderId ? this.orders.get(orderId) : undefined;
  }

  /**
   * Uppdatera order
   */
  update(orderId: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    const updated = {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(orderId, updated);

    // Uppdatera mappningar om IDs ändrats
    if (updates.sessionId) {
      this.sessionToOrderId.set(updates.sessionId, orderId);
    }
    if (updates.klarnaOrderId) {
      this.klarnaIdToOrderId.set(updates.klarnaOrderId, orderId);
    }

    // Logga uppdatering
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [ORDER UPDATED]');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Order ID:', orderId);
    console.log('Updates:', JSON.stringify(updates, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return updated;
  }

  /**
   * Lista alla ordrar
   */
  getAll(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Räkna ordrar
   */
  count(): number {
    return this.orders.size;
  }

  /**
   * Rensa alla ordrar (för testing)
   */
  clear(): void {
    this.orders.clear();
    this.sessionToOrderId.clear();
    this.klarnaIdToOrderId.clear();
    console.log('🗑️  [ORDER STORE CLEARED]');
  }

  /**
   * Hitta ordrar för en kund
   */
  findByCustomerEmail(email: string): Order[] {
    return this.getAll().filter(
      (order) => order.customer.email.toLowerCase() === email.toLowerCase(),
    );
  }

  /**
   * Hitta ordrar med specifik status
   */
  findByStatus(status: OrderStatus): Order[] {
    return this.getAll().filter((order) => order.status === status);
  }
}

/**
 * Global singleton
 */
export const orderStore = new InMemoryOrderStore();

/**
 * Generera unikt order-ID
 */
export function generateOrderId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const count = orderStore.count() + 1;
  return `ORDER-${year}-${String(count).padStart(4, '0')}`;
}

/**
 * Utility: Logga order till console (formatterat)
 */
export function logOrder(order: Order, event: string = 'ORDER') {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 [${event}]`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Order ID: ${order.id}`);
  console.log(`Status: ${order.status}`);
  console.log(`Customer: ${order.customer.email}`);
  console.log(`Total: ${order.totalInclVatOre / 100} kr`);
  console.log(`Items: ${order.items.length}`);
  order.items.forEach((item) => {
    console.log(
      `  - ${item.productId} x${item.quantity} @ ${item.priceAtPurchaseOre / 100} kr`,
    );
  });
  console.log(`Created: ${order.createdAt}`);
  if (order.updatedAt) {
    console.log(`Updated: ${order.updatedAt}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
