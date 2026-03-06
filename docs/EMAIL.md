# E-post (Transaktionsmail via Resend)

## Hur det fungerar

Orderbekräftelsen skickas automatiskt när betalningen bekräftas av Stripe (`payment_intent.succeeded`). Den är idempotent via fältet `confirmationEmailSentAt` i `Order`-tabellen.

```
webhook event: payment_intent.succeeded
  → handlePaymentIntentSucceeded() uppdaterar order till CAPTURED
  → sendOrderConfirmationById(orderId)
      → updateMany({ where: { id, confirmationEmailSentAt: null } }) → acquires lock
      → count === 1 → fetchar order + items → bygger HTML-mall → skickar via Resend
      → count === 0 → redan skickad, hoppar över
      → om Resend kastar → återställer confirmationEmailSentAt = null (retry möjlig)
```

## Nödvändiga miljövariabler

| Variabel | Syfte | Exempel |
|---|---|---|
| `RESEND_API_KEY` | Resend API-nyckel | `re_xxxxx` |
| `EMAIL_FROM` | Avsändaradress (visas för mottagaren) | `onboarding@resend.dev` (dev), `order@sazze.se` (prod) |
| `NEXT_PUBLIC_BASE_URL` | Bas-URL i mailtext (return/terms-länkar) | `https://sazze.se` |

### Dev-läge utan API-nyckel
Om `RESEND_API_KEY` saknas loggas mailinnehållet i konsolen istället för att skickas. Ingen krasch.

## Testa lokalt

### 1. Starta Next.js
```bash
npm run dev
```

### 2. Starta Stripe CLI (PowerShell)
```powershell
& "$env:LOCALAPPDATA\Microsoft\WinGet\Links\stripe.exe" listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Webhook-hemligheten skrivs ut i terminalen – kopiera in den i `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

### 3. Gör ett testköp med Stripe testkort
- Kortnummer: `4242 4242 4242 4242` (godkänns alltid)
- Valfritt datum och CVC

### 4. Verifiera i DB
Öppna Prisma Studio eller kör SQL:
```sql
SELECT "orderNumber", "paymentStatus", "status", "confirmationEmailSentAt"
FROM "Order"
ORDER BY "createdAt" DESC
LIMIT 5;
```
Förväntade värden efter lyckad betalning:
- `paymentStatus = CAPTURED`
- `status = CAPTURED`
- `confirmationEmailSentAt` är **inte** null

### 5. Kontrollera Resend Logs
Logga in på [resend.com](https://resend.com) → Logs → se det skickade mailet.

## Byta FROM-adress när domänen är verifierad

1. Verifiera domänen i Resend → Domains.
2. Ändra `EMAIL_FROM` i`.env.production`:
```
EMAIL_FROM=order@sazze.se
```
3. Redeployar (Netlify/Heroku/etc. – environment variabeln tas upp automatiskt).

## Admin: skicka om bekräftelse

```
POST /api/admin/orders/{orderId}/resend-confirmation
```

Svarar med:
```json
{ "ok": true, "message": "Orderbekräftelse skickad till kund@example.com (order ORDER-2026-0001)" }
```

## Relevanta filer

| Fil | Syfte |
|---|---|
| `src/lib/resend.ts` | Resend-klient singleton + EMAIL_FROM |
| `src/lib/emailTemplates.ts` | HTML/text-mallar (svenska) |
| `src/lib/emailService.ts` | Idempotent sändning, lock-logik |
| `src/app/api/webhooks/stripe/route.ts` | Triggar mail vid `payment_intent.succeeded` |
| `src/app/api/admin/orders/[id]/resend-confirmation/route.ts` | Admin-endpoint för manuell omsändning |
| `prisma/schema.prisma` | `confirmationEmailSentAt DateTime?` på Order |
| `prisma/migrations/20260303000000_add_confirmation_email_sent_at/` | Migration SQL |
