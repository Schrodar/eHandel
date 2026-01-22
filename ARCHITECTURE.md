# Arkitektoniska Beslut

Denna fil dokumenterar viktiga arkitektoniska beslut för e-handeln.

## 🏦 Betalningsleverantör

**Beslut:** Klarna (låst)

- Klarna används för alla betalningar
- Stöder flera betalningsmetoder (kort, delbetalning, faktura)
- Populärt i Sverige/Norden

## 🖥️ Server & Hosting

**Beslut:** Node.js Serverless på Netlify/Vercel

- **Typ:** Node.js serverless functions (ej Edge runtime)
- **Plattform:** Netlify eller Vercel
- **Frontend:** Next.js med React
- **Fördelar:**
  - Automatisk skalning
  - Enkel deployment
  - Låg kostnad för liten trafik

## 💰 Valuta & Priser

**Beslut:** SEK (svenska kronor)

### Prishantering

- **Valuta:** SEK (kr)
- **Lagring:** Alla priser lagras i **öre** (1 kr = 100 öre)
- **Visning:** Priser visas i kronor för användare (399 kr)
- **Beräkningar:** Alla beräkningar görs i öre för att undvika avrundningsfel

**Exempel:**

```typescript
// Lagrat värde
const priceInOre = 39900; // 399 kr

// Visa för användare
const displayPrice = priceInOre / 100; // 399
```

## 🧾 Moms

**Beslut:** 25% moms på kläder (svensk standard)

- **Momssats:** 25%
- **Kategori:** Kläder och textilier
- **Inkluderad:** Alla priser inkluderar moms
- **Beräkning:** Görs på serversidan

**Exempel:**

```typescript
// Pris inkl. moms
const priceInclVat = 39900; // 399 kr

// Beräkna ex. moms
const priceExclVat = Math.round(priceInclVat / 1.25); // 31920 öre (319.20 kr)
const vatAmount = priceInclVat - priceExclVat; // 7980 öre (79.80 kr)
```

## 📦 Orderstatus-flöde

**Beslut:** Följande statusflöde används

```
created       → Order skapad (initial status)
    ↓
authorized    → Betalning auktoriserad av Klarna
    ↓
placed        → Order bekräftad och placerad
    ↓
captured      → Betalning dragen (när varor skickas)
    ↓
refunded      → Pengarna återbetalda
    OR
cancelled     → Order avbruten
```

### Statusbeskrivningar

- **created:** Kund har påbörjat checkout
- **authorized:** Klarna har godkänt betalningen men pengarna är inte dragna
- **placed:** Order är bekräftad och skickad till lager
- **captured:** Pengarna är dragna från kund (sker vid leverans)
- **refunded:** Full eller delvis återbetalning har gjorts
- **cancelled:** Order avbruten innan capture

## 🔒 Säkerhetsmodell

**Beslut:** Klienten är aldrig betrodd källa för priser

### Principer

1. **Klienten skickar endast produkt-ID och kvantitet**

   ```typescript
   // ✅ Korrekt - klienten skickar
   { productId: 'white', quantity: 2 }

   // ❌ Fel - klienten skickar ALDRIG pris
   { productId: 'white', quantity: 2, price: 39900 }
   ```

2. **Servern validerar och beräknar alltid totalpris**
   - Servern hämtar aktuellt pris från databas
   - Servern beräknar totalsumma
   - Servern skickar korrekt belopp till Klarna

3. **Produktdata är alltid server-side**
   - Priser lagras på servern
   - Priser hämtas från databas/produktkatalog
   - Förhindrar prismanipulation

### Implementering

```typescript
// CLIENT (Next.js)
function checkout(cart: CartItem[]) {
  // Skicka endast ID och antal
  const items = cart.map(item => ({
    productId: item.id,
    quantity: item.quantity
  }));

  return fetch('/api/create-order', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

// SERVER (API route)
export async function POST(req: Request) {
  const { items } = await req.json();

  // Hämta VERKLIGA priser från databas
  const products = await db.getProducts(items.map(i => i.productId));

  // Beräkna totalt på serversidan
  let totalInOre = 0;
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    totalInOre += product.priceInOre * item.quantity;
  }

  // Skapa Klarna-order med korrekt pris
  const order = await klarna.createOrder({
    amount: totalInOre,
    items: // ... med server-validerade priser
  });

  return Response.json(order);
}
```

## 📝 Sammanfattning

| Beslut       | Värde                                                         |
| ------------ | ------------------------------------------------------------- |
| Betalning    | Klarna                                                        |
| Server       | Node.js Serverless (Netlify/Vercel)                           |
| Valuta       | SEK                                                           |
| Prisenhet    | Öre (1/100 kr)                                                |
| Moms         | 25% (inkluderad)                                              |
| Orderstatus  | created → authorized → placed → captured → refunded/cancelled |
| Prissäkerhet | Server är enda sanningskälla                                  |

---

**Uppdaterad:** 2026-01-19
