# Security Policy

## Rotating Secrets — Checklist

Rotate these keys immediately if any are known or suspected to be compromised.

| Secret | Where to rotate | Env var name |
|--------|----------------|--------------|
| Stripe secret key | [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys) | `STRIPE_SECRET_KEY` |
| Stripe webhook secret | [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) | `STRIPE_WEBHOOK_SECRET` |
| Supabase service role key | [Supabase Dashboard → Settings → API](https://app.supabase.com) | `SUPABASE_SERVICE_ROLE_KEY` |
| Supabase DB password | Supabase Dashboard → Settings → Database → Reset database password | `DATABASE_URL` (rebuild URL) |
| Resend API key | [Resend Dashboard → API Keys](https://resend.com/api-keys) | `RESEND_API_KEY` |

**After rotating any key:**
1. Update the env var in Netlify / Vercel dashboard (or your hosting provider).
2. Redeploy the application.
3. Do NOT put the new key in `.env` or commit it.

---

## Setting Env Vars in Production

All secrets must live in the **hosting provider's environment variable UI**, never in committed files.

- **Netlify:** Site → Site configuration → Environment variables
- **Vercel:** Project → Settings → Environment Variables

`.env.local` is acceptable for local development only and is already in `.gitignore`.

To pre-check for accidental secrets before committing:
```bash
node scripts/check-env-secrets.mjs
```

---

## publicToken — Safe Public Order Polling

Every `Order` row has a `publicToken` (random 64-char hex string, unique) generated at order creation.

The checkout success page uses this token to poll order status without exposing PII.

**What the public endpoint returns** (`GET /api/orders/:id?token=<publicToken>`):
```json
{ "id": "...", "orderNumber": "ORDER-2026-0001", "total": 29900, "paymentStatus": "CAPTURED", "status": "CAPTURED", "createdAt": "..." }
```

**What it never returns:** `customerEmail`, `customerName`, `customerPhone`, shipping/billing addresses.

If the token is missing or wrong the API always returns **404** (not 401/403) to prevent enumeration.

---

## Admin Security

- All `/admin` routes require an **authenticated Supabase session** checked by `middleware.ts`.
- Admin email must appear in `ADMIN_EMAILS` env var (comma-separated). If `ADMIN_EMAILS` is empty, admin access is denied to everyone.
- Optional MFA enforcement: set `ADMIN_REQUIRE_MFA=true`.
- All mutating admin API routes (`POST/PUT/PATCH/DELETE`) include an `assertSameOrigin()` CSRF guard.

---

## Content Security Policy

A CSP header is set on all routes in `next.config.ts`. To harden further:
- Replace `'unsafe-inline'` with a nonce-based approach (requires Next.js middleware to inject nonces).
- Replace `https:` in `connect-src` with an explicit allowlist of Stripe/Supabase endpoints.
