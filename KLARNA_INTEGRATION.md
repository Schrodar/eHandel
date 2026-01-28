# Klarna Integration - URLs & Flöde

“Klarna-ready” betyder att produkten uppfyller de minimikrav som din kod använder för att den ska kunna skickas till checkout utan att Klarna-flödet spricker p.g.a. saknade data.

I admin-detailen räknas den som Klarna-ready när:

Produkten är Published
Det finns minst 1 aktiv variant
Varje aktiv variant har:
sku
stock >= 0
images
ett pris (antingen variantens priceInCents eller produktens baspris priceInCents)
Logiken sitter i src/app/admin/products/[id]/page.tsx där klarnaReady beräknas.

## 🔗 Klarna Merchant URLs

Dessa URLs måste konfigureras i Klarna och i din applikation:

### Produktions-URLs (exempel: ehandel-uto.se)

```typescript
const KLARNA_URLS = {
  // Checkout page - där Klarna-widgeten renderas
  checkout: 'https://ehandel-uto.se/checkout',

  // Confirmation page - dit kund redirectas efter godkänd betalning
  confirmation:
    'https://ehandel-uto.se/checkout/confirmation?order_id={checkout.order.id}',

  // Push/Authorization callback - Klarna notifierar servern (server-to-server)
  push: 'https://ehandel-uto.se/api/klarna/push?order_id={checkout.order.id}',

  // Terms & Conditions
  terms: 'https://ehandel-uto.se/terms',

  // Privacy Policy
  privacy: 'https://ehandel-uto.se/privacy',

  // Shipping terms (valfritt)
  shipping: 'https://ehandel-uto.se/shipping',
};
```

### Utvecklings-URLs (localhost)

```typescript
const KLARNA_URLS_DEV = {
  checkout: 'http://localhost:3000/checkout',
  confirmation:
    'http://localhost:3000/checkout/confirmation?order_id={checkout.order.id}',
  push: 'http://localhost:3000/api/klarna/push?order_id={checkout.order.id}',
  terms: 'http://localhost:3000/terms',
  privacy: 'http://localhost:3000/privacy',
  shipping: 'http://localhost:3000/shipping',
};
```

**OBS:** För localhost-utveckling, använd Klarna Playground eller ngrok för push-URL.

## 🔄 Klarna-flöde (Visuellt)

```
┌─────────────────────────────────────────────────────────────────┐
│                         KLARNA CHECKOUT FLOW                     │
└─────────────────────────────────────────────────────────────────┘

1️⃣ USER INITIERAR CHECKOUT
   ┌──────────┐
   │  User    │  Klickar "Till kassan"
   └────┬─────┘
        │
        ▼
   ┌──────────────────┐
   │  /checkout page  │  Frontend-sida
   └────┬─────────────┘
        │
        │ POST /api/klarna/create-session
        ▼

2️⃣ SERVER SKAPAR KLARNA SESSION
   ┌─────────────────────────────────────┐
   │  POST /api/klarna/create-session    │
   │                                     │
   │  1. Validera cart-data              │
   │  2. Beräkna totalsumma (från server)│
   │  3. Skapa Klarna session            │
   │     - order_amount (öre)            │
   │     - order_lines                   │
   │     - merchant_urls                 │
   │  4. Returnera client_token          │
   └────┬────────────────────────────────┘
        │
        │ { client_token, session_id }
        ▼
   ┌──────────────────┐
   │  Frontend        │
   │                  │
   │  Sparar:         │
   │  - client_token  │
   │  - session_id    │
   └────┬─────────────┘
        │
        ▼

3️⃣ RENDERA KLARNA WIDGET
   ┌──────────────────────────────────┐
   │  Klarna.Payments.init({          │
   │    client_token: "..."           │
   │  });                             │
   │                                  │
   │  Klarna.Payments.load({          │
   │    container: "#klarna-widget"   │
   │  });                             │
   └────┬─────────────────────────────┘
        │
        │ Widget visas för kund
        ▼
   ┌──────────┐
   │  User    │  Fyller i uppgifter i Klarna-widget
   │          │  - E-post, telefon
   │          │  - Adress
   │          │  - Väljer betalmetod (kort/faktura/delbetalning)
   └────┬─────┘
        │
        │ Klickar "Slutför köp"
        ▼

4️⃣ KLARNA AUKTORISERAR BETALNING
   ┌────────────────────────────┐
   │  Klarna                    │
   │  - Kreditkontroll          │
   │  - Betalningsauktorisering │
   └────┬───────────────────────┘
        │
        ├─── ❌ DECLINED ────────────────────┐
        │                                    │
        │                                    ▼
        │                              ┌──────────┐
        │                              │  Error   │
        │                              │  Visa    │
        │                              │  meddelande
        │                              └──────────┘
        │
        └─── ✅ AUTHORIZED ──────────────┐
                                         │
                                         ▼
5️⃣ SERVER SKAPAR ORDER
   ┌─────────────────────────────────────────┐
   │  POST /api/klarna/create-order          │
   │                                         │
   │  Input: { session_id }                  │
   │                                         │
   │  1. Hämta Klarna session                │
   │  2. Validera status = authorized        │
   │  3. Extrahera kunduppgifter från Klarna │
// 3. Skapa order i DB (nu persisteras orders i Prisma) │
   │     - order_id                          │
   │     - customer_info                     │
   │     - items                             │
   │     - total_amount                      │
   │     - klarna_order_id                   │
   │     - status: 'authorized'              │

**Note:** Run `npm run migrate:dev` locally after pulling schema changes to create the orders tables.
   │  5. Logga till console/fil              │
   │  6. Returnera order_id                  │
   └────┬────────────────────────────────────┘
        │
        │ { order_id, klarna_order_id }
        ▼

6️⃣ KLARNA PUSH NOTIFICATION (Server-to-Server)
   ┌──────────────────────────────────────┐
   │  POST /api/klarna/push               │
   │  ?order_id={checkout.order.id}       │
   │                                      │
   │  Klarna skickar när status ändras:   │
   │  - Payment authorized                │
   │  - Order captured                    │
   │  - Order cancelled                   │
   │                                      │
   │  1. Verifiera Klarna signature       │
   │  2. Hämta order från "minnet"        │
   │  3. Uppdatera status                 │
   │  4. Logga händelse                   │
   │  5. Returnera 200 OK                 │
   └────┬─────────────────────────────────┘
        │
        │ (Parallel process, påverkar ej user flow)
        │
        ▼

7️⃣ REDIRECT TILL CONFIRMATION
   ┌──────────┐
   │  User    │
   └────┬─────┘
        │
        │ Klarna redirectar automatiskt
        ▼
   ┌────────────────────────────────────┐
   │  /checkout/confirmation            │
   │  ?order_id={order_id}              │
   │                                    │
   │  1. Hämta order från "minnet"      │
   │  2. Visa orderbekräftelse          │
   │     - Order nummer                 │
   │     - Produkter                    │
   │     - Total                        │
   │     - Leveransadress               │
   │  3. Skicka bekräftelsemail (TODO)  │
   │  4. Töm varukorg                   │
   └────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         KOMPLETT! ✅                             │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Dataflöde per Steg

### Steg 1: Create Session

**Request (Client → Server):**

```json
POST /api/klarna/create-session

{
  "items": [
    { "productId": "white", "quantity": 2 },
    { "productId": "black", "quantity": 1 }
  ]
}
```

**Server-processing:**

```typescript
// 1. Hämta produkter och beräkna
const products = items.map((item) => ({
  product: getProductById(item.productId)!,
  quantity: item.quantity,
}));

const orderTotal = calculateOrderTotal(products);

// 2. Skapa Klarna session
const klarnaSession = await klarnaClient.createSession({
  purchase_country: 'SE',
  purchase_currency: 'SEK',
  locale: 'sv-SE',
  order_amount: orderTotal.totalInclVatOre,
  order_tax_amount: orderTotal.totalVatOre,
  order_lines: products.map((p) => ({
    type: 'physical',
    reference: p.product.id,
    name: p.product.name,
    quantity: p.quantity,
    unit_price: p.product.priceInOre,
    tax_rate: p.product.vatBasisPoints / 100, // 2500 → 25.00
    total_amount: p.product.priceInOre * p.quantity,
    total_tax_amount: calculateVatAmount(
      p.product.priceInOre * p.quantity,
      p.product.vatBasisPoints,
    ),
  })),
  merchant_urls: {
    terms: `${BASE_URL}/terms`,
    checkout: `${BASE_URL}/checkout`,
    confirmation: `${BASE_URL}/checkout/confirmation?session_id={checkout.order.id}`,
    push: `${BASE_URL}/api/klarna/push?session_id={checkout.order.id}`,
  },
});
```

**Response (Server → Client):**

```json
{
  "client_token": "eyJhbGci...",
  "session_id": "klarna-session-123",
  "order_amount": 119700
}
```

### Steg 2: Render Widget

**Client-side:**

```typescript
// 1. Ladda Klarna SDK
<script src="https://x.klarnacdn.net/kp/lib/v1/api.js"></script>

// 2. Initiera
Klarna.Payments.init({
  client_token: clientToken
});

// 3. Ladda widget
Klarna.Payments.load({
  container: '#klarna-payments-container',
  payment_method_category: 'pay_later'
}, (res) => {
  console.log('Widget loaded:', res);
});
```

### Steg 3: Authorize

**Client-side:**

```typescript
// När kund klickar "Slutför"
Klarna.Payments.authorize(
  {
    payment_method_category: 'pay_later',
  },
  {},
  (res) => {
    if (res.approved) {
      // Authorization godkänd!
      const authToken = res.authorization_token;

      // Skicka till server för att skapa order
      createOrder(authToken);
    } else {
      // Visa fel
      console.error('Payment declined:', res);
    }
  },
);
```

### Steg 4: Create Order

**Request (Client → Server):**

```json
POST /api/klarna/create-order

{
  "authorization_token": "klarna-auth-token-xyz",
  "session_id": "klarna-session-123"
}
```

**Server-processing:**

```typescript
// 1. Skapa Klarna order
const klarnaOrder = await klarnaClient.createOrder(authorizationToken);

// 2. Spara order (i minnet för nu)
const order = {
  id: generateOrderId(), // "ORDER-2026-0001"
  klarnaOrderId: klarnaOrder.order_id,
  status: 'authorized',
  customer: {
    email: klarnaOrder.billing_address.email,
    firstName: klarnaOrder.billing_address.given_name,
    lastName: klarnaOrder.billing_address.family_name,
    // ...
  },
  items: klarnaOrder.order_lines.map((line) => ({
    productId: line.reference,
    quantity: line.quantity,
    priceAtPurchaseOre: line.unit_price,
  })),
  totalInclVatOre: klarnaOrder.order_amount,
  createdAt: new Date().toISOString(),
};

// 3. Logga till console (eller fil)
console.log('[ORDER CREATED]', JSON.stringify(order, null, 2));

// 4. Spara i minne (Map eller global variabel)
orderStore.set(order.id, order);
```

**Response (Server → Client):**

```json
{
  "order_id": "ORDER-2026-0001",
  "klarna_order_id": "klarna-order-456",
  "confirmation_url": "/checkout/confirmation?order_id=ORDER-2026-0001"
}
```

### Steg 5: Push Notification

**Request (Klarna → Server):**

```
POST /api/klarna/push?session_id=klarna-session-123
Headers:
  Klarna-Signature: sha256=...

Body: (empty, order_id i URL)
```

**Server-processing:**

```typescript
// 1. Verifiera Klarna signature (säkerhet)
const isValid = verifyKlarnaSignature(req);
if (!isValid) {
  return new Response('Unauthorized', { status: 401 });
}

// 2. Hämta session_id från URL
const sessionId = new URL(req.url).searchParams.get('session_id');

// 3. Hämta Klarna order
const klarnaOrder = await klarnaClient.getOrder(sessionId);

// 4. Uppdatera lokal order
const order = orderStore.get(sessionId);
if (order) {
  order.status = klarnaOrder.status; // 'authorized', 'captured', etc.
  order.updatedAt = new Date().toISOString();

  console.log('[KLARNA PUSH]', {
    orderId: order.id,
    newStatus: klarnaOrder.status,
    timestamp: order.updatedAt,
  });
}

// 5. Returnera 200 (Klarna kräver detta)
return new Response('OK', { status: 200 });
```

### Steg 6: Confirmation Page

**Request (Client):**

```
GET /checkout/confirmation?order_id=ORDER-2026-0001
```

**Server-processing (SSR):**

```typescript
// 1. Hämta order från minnet
const orderId = searchParams.get('order_id');
const order = orderStore.get(orderId);

if (!order) {
  return <ErrorPage message="Order not found" />;
}

// 2. Rendera confirmation
return (
  <div>
    <h1>Tack för din beställning!</h1>
    <p>Ordernummer: {order.id}</p>
    <p>E-post bekräftelse skickad till: {order.customer.email}</p>

    <div>
      <h2>Din beställning</h2>
      {order.items.map(item => (
        <div key={item.productId}>
          {item.quantity}x {getProductById(item.productId)?.name}
        </div>
      ))}
    </div>

    <p>Totalt: {formatPrice(order.totalInclVatOre)}</p>
  </div>
);
```

## 💾 In-Memory Storage (Utan DB)

För utveckling och testning utan databas:

```typescript
// lib/orderStore.ts

type Order = {
  id: string;
  klarnaOrderId: string;
  sessionId: string;
  status: 'created' | 'authorized' | 'captured' | 'cancelled' | 'refunded';
  customer: CustomerInfo;
  items: Array<{
    productId: ProductId;
    quantity: number;
    priceAtPurchaseOre: number;
  }>;
  totalInclVatOre: number;
  totalVatOre: number;
  createdAt: string;
  updatedAt?: string;
};

class InMemoryOrderStore {
  private orders = new Map<string, Order>();
  private sessionToOrderId = new Map<string, string>();

  create(order: Order): Order {
    this.orders.set(order.id, order);
    this.sessionToOrderId.set(order.sessionId, order.id);

    // Logga till console och/eller fil
    console.log('[ORDER CREATED]', JSON.stringify(order, null, 2));
    this.writeToLog(order);

    return order;
  }

  get(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getBySessionId(sessionId: string): Order | undefined {
    const orderId = this.sessionToOrderId.get(sessionId);
    return orderId ? this.orders.get(orderId) : undefined;
  }

  update(orderId: string, updates: Partial<Order>): Order | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    const updated = {
      ...order,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(orderId, updated);

    console.log('[ORDER UPDATED]', { orderId, updates });
    this.writeToLog(updated);

    return updated;
  }

  getAll(): Order[] {
    return Array.from(this.orders.values());
  }

  private writeToLog(order: Order) {
    // I produktion: skriv till fil eller loggnings-service
    // För nu: bara console
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: 'ORDER_EVENT',
      order,
    };

    // Kan även skriva till fil:
    // fs.appendFileSync('orders.log', JSON.stringify(logEntry) + '\n');
  }
}

// Global singleton
export const orderStore = new InMemoryOrderStore();
```

**Användning:**

```typescript
// Skapa order
const order = orderStore.create({
  id: 'ORDER-2026-0001',
  klarnaOrderId: 'klarna-123',
  sessionId: 'session-456',
  status: 'authorized',
  customer: {
    /* ... */
  },
  items: [
    /* ... */
  ],
  totalInclVatOre: 119700,
  totalVatOre: 23940,
  createdAt: new Date().toISOString(),
});

// Hämta order
const order = orderStore.get('ORDER-2026-0001');

// Hämta via session ID (från Klarna push)
const order = orderStore.getBySessionId('session-456');

// Uppdatera
orderStore.update('ORDER-2026-0001', { status: 'captured' });

// Lista alla (för admin/debug)
const allOrders = orderStore.getAll();
```

## 🧪 Testning utan DB

### Manual test-flow

1. **Skapa test-order:**

   ```bash
   curl -X POST http://localhost:3000/api/klarna/create-session \
     -H "Content-Type: application/json" \
     -d '{"items":[{"productId":"white","quantity":2}]}'
   ```

2. **Kontrollera in-memory storage:**

   ```typescript
   // I API route eller debug endpoint
   GET / api / debug / orders;

   export async function GET() {
     const orders = orderStore.getAll();
     return Response.json(orders);
   }
   ```

3. **Simulera Klarna push:**

   ```bash
   curl -X POST "http://localhost:3000/api/klarna/push?session_id=test-session-123"
   ```

4. **Visa confirmation:**
   ```
   http://localhost:3000/checkout/confirmation?order_id=ORDER-2026-0001
   ```

### Persistence mellan server-restarter

Om du vill ha persistence utan DB:

```typescript
// lib/orderStore.ts

class PersistentOrderStore extends InMemoryOrderStore {
  private filePath = './orders.json';

  constructor() {
    super();
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      const orders = JSON.parse(data);
      orders.forEach((order: Order) => {
        this.orders.set(order.id, order);
        this.sessionToOrderId.set(order.sessionId, order.id);
      });
      console.log(`Loaded ${orders.length} orders from file`);
    } catch (err) {
      console.log('No existing orders file, starting fresh');
    }
  }

  private saveToFile() {
    const orders = this.getAll();
    fs.writeFileSync(this.filePath, JSON.stringify(orders, null, 2));
  }

  create(order: Order): Order {
    const created = super.create(order);
    this.saveToFile();
    return created;
  }

  update(orderId: string, updates: Partial<Order>): Order | undefined {
    const updated = super.update(orderId, updates);
    if (updated) this.saveToFile();
    return updated;
  }
}
```

## 📋 Checklist

- [ ] Konfigurera Klarna merchant URLs (dev + prod)
- [ ] Implementera `/api/klarna/create-session`
- [ ] Implementera `/api/klarna/create-order`
- [ ] Implementera `/api/klarna/push`
- [ ] Skapa `/checkout` page med Klarna widget
- [ ] Skapa `/checkout/confirmation` page
- [ ] Implementera in-memory order storage
- [ ] Testa hela flödet lokalt
- [ ] Verifiera att push notification fungerar
- [ ] Logga alla steg för debugging
- [ ] (Senare) Migrera från in-memory till riktig databas

---

**Sammanfattning:**

- ✅ Alla Klarna URLs definierade
- ✅ Komplett flöde visuellt dokumenterat
- ✅ In-memory storage för ordrar
- ✅ Testbart utan databas
- ✅ Loggar till console/fil
- ✅ Redo för Klarna-integration
