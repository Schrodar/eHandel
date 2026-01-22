# Produktkatalog - Användarguide

## 📦 Översikt

Produktkatalogen i `products.ts` är den enda sanningskällan för all produktdata och prissättning. Den innehåller:

- Produktdefinitioner med stabila ID:n
- Priser i öre (ej kronor)
- Momssatser i basis points
- Hjälpfunktioner för prisberäkningar

## 🔒 Viktiga Principer

### 1. Produkt-IDs är LÅSTA

```typescript
export type ProductId = 'white' | 'black';
```

**ALDRIG ändra dessa ID:n!** De används i:

- Databas (framtida ordrar)
- URL:er (`/product?c=white`)
- Varukorg state
- Klarna-integrationer

### 2. Alla priser i ÖRE

```typescript
priceInOre: 39900; // = 399 kr
```

**Varför öre?**

- Undviker avrundningsfel med decimaler
- Hela tal = exakta beräkningar
- Standard för betalningsleverantörer

### 3. Moms i BASIS POINTS

```typescript
vatBasisPoints: 2500; // = 25%
```

**Basis points:**

- 1 bp = 0.01%
- 2500 bp = 25%
- Exakta beräkningar utan decimaler

## 🛠️ API

### Hämta produkt

```typescript
import { getProductById } from '@/components/products';

const product = getProductById('white');
// { id: 'white', name: '...', priceInOre: 39900, ... }
```

### Beräkna radbelopp

```typescript
import { calculateLineTotal } from '@/components/products';

const product = getProductById('white');
const line = calculateLineTotal(product!, 2);

// line.totalInclVatOre = 79800 (798 kr)
// line.totalExVatOre = 63840 (638.40 kr)
// line.vatAmountOre = 15960 (159.60 kr)
```

### Beräkna ordertotal

```typescript
import { calculateOrderTotal, getProductById } from '@/components/products';

const items = [
  { product: getProductById('white')!, quantity: 2 },
  { product: getProductById('black')!, quantity: 1 },
];

const order = calculateOrderTotal(items);

// order.totalInclVatOre = 119700 (1197 kr)
// order.totalExVatOre = 95760 (957.60 kr)
// order.totalVatOre = 23940 (239.40 kr)
// order.lineItems = [ ... detaljer per rad ... ]
```

### Formatera pris för visning

```typescript
import { formatPrice } from '@/components/products';

const displayPrice = formatPrice(39900);
// "399 kr"
```

### Validera order (server-side)

```typescript
import { validateOrderTotal } from '@/components/products';

// Klient skickar
const clientOrder = {
  items: [
    { productId: 'white', quantity: 2 },
    { productId: 'black', quantity: 1 },
  ],
  totalFromClient: 119700,
};

// Server validerar
const validation = validateOrderTotal(
  clientOrder.items,
  clientOrder.totalFromClient,
);

if (!validation.valid) {
  throw new Error(`Prismatchning fel! Diff: ${validation.diff} öre`);
}
```

## 📊 Exempel på Prisflöde

### Klient → Server

```typescript
// ❌ ALDRIG skicka pris från klient
{
  productId: 'white',
  quantity: 2,
  price: 39900  // ← ALDRIG!
}

// ✅ Skicka endast ID och antal
{
  productId: 'white',
  quantity: 2
}
```

### Server hämtar pris

```typescript
// API route: /api/checkout
export async function POST(req: Request) {
  const { items } = await req.json();
  // items = [{ productId: 'white', quantity: 2 }]

  // Hämta VERKLIGA priser från katalog
  const products = items.map((item) => ({
    product: getProductById(item.productId)!,
    quantity: item.quantity,
  }));

  // Beräkna korrekt total
  const { totalInclVatOre } = calculateOrderTotal(products);

  // Skicka till Klarna med server-validerat pris
  const klarnaOrder = await klarna.createOrder({
    amount: totalInclVatOre,
    // ...
  });

  return Response.json(klarnaOrder);
}
```

## 🧮 Momsberäkningar

### Pris inkl. moms → ex. moms

```typescript
import { calculatePriceExVat } from '@/components/products';

const priceExVat = calculatePriceExVat(39900, 2500);
// 31920 öre (319.20 kr)

// Formel: priceExVat = priceInclVat / (1 + vat%)
// = 39900 / 1.25 = 31920
```

### Momsbelopp

```typescript
import { calculateVatAmount } from '@/components/products';

const vat = calculateVatAmount(39900, 2500);
// 7980 öre (79.80 kr)

// vat = priceInclVat - priceExVat
// = 39900 - 31920 = 7980
```

## 🔐 Säkerhet

### Deterministiska beräkningar

Alla prisberäkningar är:

- **Deterministiska:** Samma input → samma output
- **Testbara:** Inga externa beroenden
- **Server-safe:** Fungerar både client och server

### Klient får ALDRIG ändra priser

```typescript
// Klient skickar detta till server:
const orderRequest = {
  items: cart.map((item) => ({
    productId: item.product.id,
    quantity: item.quantity,
    // INGET pris!
  })),
};

// Server beräknar allt:
const order = calculateOrderFromIds(orderRequest.items);
```

## 📝 Lägga till ny produkt

```typescript
// I products.ts
export const PRODUCTS = [
  // ... befintliga produkter
  {
    id: 'blue', // ← Lägg till i ProductId type först!
    name: 'Essential Tee — Blå',
    priceInOre: 39900,
    vatBasisPoints: 2500,
    image: '/Tbla.png',
    description: 'Minimalist blå t-shirt',
  },
] as const;

// Uppdatera också typen:
export type ProductId = 'white' | 'black' | 'blue';
```

## ✅ Best Practices

1. **Använd alltid getProductById()** istället för att söka i PRODUCTS själv
2. **Formatera priser med formatPrice()** för visning
3. **Beräkna ordertotal med calculateOrderTotal()** för konsistens
4. **Validera totaler** när klient och server kommunicerar
5. **Lagra alltid i öre** - konvertera endast för visning

## 🚫 Vanliga Misstag

```typescript
// ❌ Fel: Blandar kronor och öre
const total = product.priceInOre + 100; // Vad är 100? Kr eller öre?

// ✅ Rätt: Tydligt med enheter
const shippingInOre = 10000; // 100 kr
const total = product.priceInOre + shippingInOre;

// ❌ Fel: Beräknar moms manuellt
const vat = price * 0.25;

// ✅ Rätt: Använd färdig funktion
const vat = calculateVatAmount(price, product.vatBasisPoints);

// ❌ Fel: Skickar pris från klient
fetch('/api/order', {
  body: JSON.stringify({
    productId: 'white',
    price: 39900, // ← ALDRIG!
  }),
});

// ✅ Rätt: Endast ID
fetch('/api/order', {
  body: JSON.stringify({
    productId: 'white',
  }),
});
```

---

**Sammanfattning:** Produktkatalogen är kärnan i prissättningen. Använd de färdiga funktionerna, räkna alltid i öre, och lita aldrig på priser från klienten.
