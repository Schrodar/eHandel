/**
 * Simple mock Klarna client for development/testing.
 * Keeps in-memory mappings of sessions -> orders and simulates statuses.
 */

type KlarnaOrderLine = {
  reference: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_rate: number;
};

type KlarnaOrder = {
  order_id: string;
  status: 'authorized' | 'created' | 'captured' | 'cancelled';
  billing_address: {
    email: string;
    given_name?: string;
    family_name?: string;
    phone?: string;
  };
  order_lines: KlarnaOrderLine[];
  order_amount: number;
};

const store = new Map<string, KlarnaOrder>();

function generateKlarnaOrderId() {
  return `klarna-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export async function createOrderMock(authorizationToken: string, payload: { order_lines: KlarnaOrderLine[]; order_amount: number; billing: { email: string; given_name?: string; family_name?: string; phone?: string } }) {
  // In real life we'd call Klarna's API. Here return a mocked order object.
  const id = generateKlarnaOrderId();
  const order: KlarnaOrder = {
    order_id: id,
    status: 'authorized',
    billing_address: {
      email: payload.billing.email,
      given_name: payload.billing.given_name,
      family_name: payload.billing.family_name,
      phone: payload.billing.phone,
    },
    order_lines: payload.order_lines,
    order_amount: payload.order_amount,
  };

  // Store by order id
  store.set(id, order);
  return order;
}

export async function getOrderMock(orderIdOrSessionId: string) {
  // Try by order id
  if (store.has(orderIdOrSessionId)) return store.get(orderIdOrSessionId)!;
  // Not implementing session id mapping in mock for simplicity
  return undefined;
}

export async function updateOrderStatusMock(orderId: string, status: KlarnaOrder['status']) {
  const o = store.get(orderId);
  if (!o) return undefined;
  o.status = status;
  store.set(orderId, o);
  return o;
}
