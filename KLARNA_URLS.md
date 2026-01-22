# Klarna URLs - Snabbreferens

## 🌐 URL-konfiguration

### BASE_URL

- **Utveckling:** `http://localhost:3000`
- **Produktion:** `https://ehandel-uto.se`

### Endpoints

| Typ              | URL                                                     | Beskrivning                               |
| ---------------- | ------------------------------------------------------- | ----------------------------------------- |
| **Checkout**     | `${BASE_URL}/checkout`                                  | Sida där Klarna-widget visas              |
| **Confirmation** | `${BASE_URL}/checkout/confirmation?order_id={order_id}` | Tack-sida efter godkänd betalning         |
| **Push**         | `${BASE_URL}/api/klarna/push?session_id={session_id}`   | Server-to-server notifikation från Klarna |
| **Terms**        | `${BASE_URL}/terms`                                     | Köpvillkor                                |
| **Privacy**      | `${BASE_URL}/privacy`                                   | Integritetspolicy                         |

## 🔄 API Endpoints (våra)

| Method | Endpoint                     | Syfte                               |
| ------ | ---------------------------- | ----------------------------------- |
| POST   | `/api/klarna/create-session` | Skapa Klarna checkout session       |
| POST   | `/api/klarna/create-order`   | Skapa order efter auktorisering     |
| POST   | `/api/klarna/push`           | Ta emot Klarna push-notifieringar   |
| GET    | `/api/orders/:id`            | Hämta order (för confirmation page) |

## 📦 Klarna-flöde (förenklat)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  User   │───▶│ Session │───▶│ Klarna  │───▶│  Order  │
│ Checkout│    │ Created │    │ Widget  │    │ Created │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
/checkout    POST /api/      Klarna SDK    POST /api/
             create-session               create-order
                                                  │
                                                  ▼
                                          /checkout/
                                          confirmation
```

## 🔑 Klarna Credentials

```typescript
// .env.local
KLARNA_USERNAME=PK12345_abc123def456
KLARNA_PASSWORD=shpss_xxx...
KLARNA_API_URL=https://api.playground.klarna.com  // Test
// KLARNA_API_URL=https://api.klarna.com         // Produktion
```

## 📝 Exempel: merchant_urls object

```typescript
{
  merchant_urls: {
    terms: 'https://ehandel-uto.se/terms',
    checkout: 'https://ehandel-uto.se/checkout',
    confirmation: 'https://ehandel-uto.se/checkout/confirmation?order_id={checkout.order.id}',
    push: 'https://ehandel-uto.se/api/klarna/push?session_id={checkout.order.id}'
  }
}
```

**OBS:** `{checkout.order.id}` är Klarna placeholder som ersätts automatiskt.

## 🧪 Testing

### Lokal utveckling med ngrok

```bash
# Terminal 1: Starta Next.js
npm run dev

# Terminal 2: Starta ngrok
ngrok http 3000

# Använd ngrok URL som BASE_URL:
# https://abc123.ngrok.io
```

### Klarna Playground

- URL: https://api.playground.klarna.com
- Test credentials från Klarna Portal
- Simulera olika scenarios (godkänd, nekad, etc.)

---

**Se [KLARNA_INTEGRATION.md](KLARNA_INTEGRATION.md) för komplett dokumentation.**
