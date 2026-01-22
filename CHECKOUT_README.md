# Checkout & Varukorg - Dokumentation

## 📦 Single Source of Truth

Varukorgen hanteras centralt i `CartProvider` med `useCart` hook.

### Varukorg State

```typescript
// Lagras som Record<ProductId, number>
const cart = {
  white: 2, // 2 st vita t-shirts
  black: 1, // 1 st svart t-shirt
};
```

**Viktigt:**

- ✅ Endast `CartProvider` håller cart state
- ✅ Komponenter använder `useCartContext()` för att läsa/ändra
- ✅ Ingen dubbel state någonstans
- ✅ Cart är alltid synkad

### Åtkomst till Varukorg

```typescript
'use client';

import { useCartContext } from '@/context/CartProvider';

export default function MyComponent() {
  const { cart, items, totalQty, add, setQty, openCart } = useCartContext();

  // cart: Record<ProductId, number> - rådata
  // items: Array<{ product: Product, qty: number }> - berikad data
  // totalQty: number - totalt antal items
  // add: (id) => void - lägg till 1
  // setQty: (id, qty) => void - sätt exakt antal
  // openCart: () => void - öppna varukorgs-drawer

  return (
    <button onClick={() => add('white')}>
      Lägg till vit t-shirt
    </button>
  );
}
```

## 🛒 Checkout-flöde

### 1. Kund öppnar kassan

```typescript
const { openCheckout } = useCartContext();

// Från varukorg:
<button onClick={openCheckout}>Till kassan</button>
```

### 2. CheckoutModal samlar in data

Modal visar:

- **Order-sammanfattning** med alla produkter och totalsumma
- **Formulär** för kunduppgifter
- **Validering** i realtid

**Obligatoriska fält:**

- ✅ Förnamn
- ✅ Efternamn
- ✅ E-post
- ✅ Gatuadress
- ✅ Postnummer
- ✅ Stad
- ✅ Land (låst till SE)

**Valfria fält:**

- ⚪ Telefon

### 3. Data skickas till server

När användaren klickar "Slutför beställning":

```typescript
// CheckoutModal skapar request
const checkoutRequest = {
  items: [
    { productId: 'white', quantity: 2 }, // ALDRIG pris!
    { productId: 'black', quantity: 1 },
  ],
  customer: {
    email: 'user@example.com',
    phone: '0701234567',
    firstName: 'Anna',
    lastName: 'Andersson',
    streetAddress: 'Storgatan 1',
    postalCode: '12345',
    city: 'Stockholm',
    country: 'SE',
  },
};

// I produktion: skicka till API
const response = await fetch('/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(checkoutRequest),
});
```

### 4. Server bearbetar (framtida implementation)

```typescript
// /app/api/checkout/route.ts
export async function POST(req: Request) {
  const { items, customer } = await req.json();

  // 1. Hämta VERKLIGA priser från produktkatalog
  const products = items.map((item) => ({
    product: getProductById(item.productId)!,
    quantity: item.quantity,
  }));

  // 2. Beräkna korrekt total
  const orderTotal = calculateOrderTotal(products);

  // 3. Validera mot eventuell klient-skickad summa
  // (för dubbel-kontroll, men server har sista ordet)

  // 4. Skapa order i databas
  const order = await db.createOrder({
    customerId: customer.email,
    items: products.map((p) => ({
      productId: p.product.id,
      quantity: p.quantity,
      priceAtPurchaseOre: p.product.priceInOre,
      vatBasisPoints: p.product.vatBasisPoints,
    })),
    totalInclVatOre: orderTotal.totalInclVatOre,
    totalExVatOre: orderTotal.totalExVatOre,
    totalVatOre: orderTotal.totalVatOre,
    status: 'created',
  });

  // 5. Skapa Klarna-betalning
  const klarnaOrder = await klarna.createOrder({
    purchase_country: 'SE',
    purchase_currency: 'SEK',
    locale: 'sv-SE',
    order_amount: orderTotal.totalInclVatOre, // i öre
    order_tax_amount: orderTotal.totalVatOre, // i öre
    order_lines: products.map((p) => ({
      name: p.product.name,
      quantity: p.quantity,
      unit_price: p.product.priceInOre,
      tax_rate: p.product.vatBasisPoints / 100, // Klarna vill procent
      total_amount: p.product.priceInOre * p.quantity,
      total_tax_amount: calculateVatAmount(
        p.product.priceInOre * p.quantity,
        p.product.vatBasisPoints,
      ),
    })),
    billing_address: {
      email: customer.email,
      phone: customer.phone,
      given_name: customer.firstName,
      family_name: customer.lastName,
      street_address: customer.streetAddress,
      postal_code: customer.postalCode,
      city: customer.city,
      country: customer.country,
    },
    shipping_address: {
      /* samma som billing */
    },
  });

  // 6. Returnera Klarna snippet för klienten
  return Response.json({
    orderId: order.id,
    klarnaSnippet: klarnaOrder.html_snippet,
  });
}
```

## 🔐 Säkerhetsprinciper

### ❌ Klienten skickar ALDRIG pris

```typescript
// ALDRIG göra detta:
{
  productId: 'white',
  quantity: 2,
  price: 39900  // ❌ Förbjudet!
}

// Alltid göra detta:
{
  productId: 'white',
  quantity: 2   // ✅ Endast ID och antal
}
```

### ✅ Servern är enda sanningskälla

1. Klient skickar endast `productId` och `quantity`
2. Server hämtar pris från `getProductById()`
3. Server beräknar total med `calculateOrderTotal()`
4. Server skickar korrekt belopp till Klarna

### Validering

`validateCheckoutRequest()` körs på både klient och server:

**Klient-validering:**

- Snabb feedback till användare
- Förhindrar onödiga server-requests
- Förbättrar UX

**Server-validering:**

- Säkerställer dataintegritet
- Kan inte kringgås
- Sista ordet i vad som är giltigt

## 📋 Dataflöde Steg-för-Steg

### Frontend (Klient)

```typescript
// 1. Användare lägger produkter i varukorg
const { add } = useCartContext();
add('white');
add('white');
add('black');

// State i CartProvider:
// cart = { white: 2, black: 1 }

// 2. Användare går till kassan
openCheckout();

// 3. CheckoutModal visar:
// - Ordersammanfattning (från items)
// - Totalsumma (calculateOrderTotal)
// - Formulär för kunduppgifter

// 4. Användare fyller i formulär och skickar
const customer = {
  email: '...',
  firstName: '...',
  // ...
};

// 5. Skapa checkout request
const request = createCheckoutRequest(cart, customer);
// {
//   items: [
//     { productId: 'white', quantity: 2 },
//     { productId: 'black', quantity: 1 }
//   ],
//   customer: { ... }
// }

// 6. Validera lokalt
const validation = validateCheckoutRequest(request);
if (!validation.valid) {
  // Visa fel till användare
  return;
}

// 7. Skicka till server
const response = await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify(request),
});

// 8. Hantera respons
const { orderId, klarnaSnippet } = await response.json();

// 9. Visa Klarna checkout
// (injicera klarnaSnippet i DOM)

// 10. Efter godkänd betalning: töm varukorg
reset();
```

### Backend (Server)

```typescript
// 1. Ta emot request
const { items, customer } = await req.json();

// 2. Validera (dubbel-kolla)
const validation = validateCheckoutRequest({ items, customer });
if (!validation.valid) {
  return Response.json({ error: validation.errors }, { status: 400 });
}

// 3. Berika med produktdata
const products = items.map((item) => ({
  product: getProductById(item.productId)!,
  quantity: item.quantity,
}));

// 4. Beräkna korrekt total
const orderTotal = calculateOrderTotal(products);

// 5. Spara order i databas (status: 'created')
const order = await db.orders.create({
  customerEmail: customer.email,
  totalInclVatOre: orderTotal.totalInclVatOre,
  status: 'created',
  // ...
});

// 6. Skapa Klarna-order
const klarnaOrder = await klarna.createOrder({
  order_amount: orderTotal.totalInclVatOre,
  // ...
});

// 7. Uppdatera order med Klarna-ID
await db.orders.update(order.id, {
  klarnaOrderId: klarnaOrder.order_id,
  status: 'authorized', // Om Klarna godkänner direkt
});

// 8. Returnera till klient
return Response.json({
  orderId: order.id,
  klarnaSnippet: klarnaOrder.html_snippet,
});
```

## 🧪 Testning

### Testa checkout-flödet

```typescript
import {
  createCheckoutRequest,
  validateCheckoutRequest,
} from '@/components/checkout';

// Skapa test-cart
const cart = { white: 2, black: 1 };

// Skapa test-customer
const customer = {
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'Person',
  streetAddress: 'Testgatan 1',
  postalCode: '12345',
  city: 'Stockholm',
  country: 'SE' as const,
};

// Skapa request
const request = createCheckoutRequest(cart, customer);

// Validera
const validation = validateCheckoutRequest(request);
console.log('Valid:', validation.valid);
console.log('Errors:', validation.errors);

// Verifiera att inget pris skickas
console.log('Items:', request.items);
// [
//   { productId: 'white', quantity: 2 },
//   { productId: 'black', quantity: 1 }
// ]
```

## 📊 Orderstatus

Efter checkout följer ordern detta flöde:

```
created       → Order skapad, Klarna-checkout visas
    ↓
authorized    → Kund godkände betalning i Klarna
    ↓
placed        → Order bekräftad, skickad till lager
    ↓
captured      → Betalning dragen (när varor skickas)
    ↓
refunded      → Pengarna återbetalda (vid retur)
    OR
cancelled     → Order avbruten
```

## 🔄 Återskapa Order från Data

Eftersom vi alltid skickar `productId` och `quantity`, kan vi återskapa exakt orderdata:

```typescript
// Från historisk order
const historicalOrder = {
  items: [
    { productId: 'white', quantity: 2 },
    { productId: 'black', quantity: 1 },
  ],
};

// Återskapa med aktuella produkter
const products = historicalOrder.items.map((item) => ({
  product: getProductById(item.productId)!,
  quantity: item.quantity,
}));

// Beräkna (men använd INTE för historiska ordrar -
// använd sparade priser istället!)
const recalculated = calculateOrderTotal(products);
```

**Viktigt för historik:**
När du visar gamla ordrar, använd **sparade priser från databasen**, inte aktuella priser från katalogen (de kan ha ändrats).

---

**Sammanfattning:**

- ✅ En enda varukorg i `CartProvider`
- ✅ Checkout skickar endast `{ productId, quantity }`
- ✅ Server beräknar och validerar allt
- ✅ Klara kundfält definierade
- ✅ Land låst till SE initialt
- ✅ Telefon valfritt
