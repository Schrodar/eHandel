# Admin security (Supabase Auth + Next.js)

Det här projektet har **defense-in-depth** för `/admin/**`:

- Edge gate via middleware (stoppar tidigt)
- Server-side gate via `/admin/(protected)/layout.tsx` (renderar aldrig admin-HTML utan admin-session)
- Server actions gör `requireAdminSession()` (mutations kan inte köras utan admin)

## Miljövariabler

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_EMAILS` (komma-separerad allowlist; secure default = deny om tom)
- `ADMIN_REQUIRE_MFA` (default på; sätt `0` för att stänga av)

## MFA

- Appen kräver AAL2 (TOTP) innan skyddade admin-sidor går att nå.
- Obs: AAL2 kan inte enforce:as via Postgres RLS. Den enforcementen ligger i Next.js (middleware + server layout).

## Supabase RLS (SQL)

Om ni använder Supabase Postgres via Supabase-rollen (t.ex. från klienten eller edge functions) bör ni ha RLS.

- SQL finns i: `docs/SUPABASE_RLS.sql`

Den gör:

- Skapar `public.admin_allowlist` (DB-side allowlist)
- Skapar `public.is_admin()` (baserat på JWT-email)
- Sätter policies på:
  - `"Product"`, `"ProductVariant"` (public read published/active + admin full access)
  - `"Category"`, `"Material"`, `"Color"` (public read + admin write)
  - `"Order"`, `"OrderItem"` (admin-only)

### Viktigt om Prisma

Prisma brukar köra mot en **privilegierad** DB-connection. Då bypass:as RLS, vilket är okej så länge server-side guards finns (det gör det nu).
RLS är framförallt värdefullt om ni börjar exponera data via Supabase direkt.

## Seed + verifiera RLS (praktiskt)

### 1) Lägg in admin i DB-allowlist

Kör i Supabase SQL editor (som DB-admin):

```sql
insert into public.admin_allowlist(email)
values ('admin@dindomän.se')
on conflict (email) do nothing;
```

Obs: `admin_allowlist` är avsiktligt låst för `anon`/`authenticated` (endast DB-admin/service kan skriva).

### 2) Verifiera att RLS faktiskt gäller

RLS triggas när ni går via Supabase (REST/GraphQL/supabase-js). Om ni testar via Prisma/server-DB-connection kan det se ut som att “allt funkar” även om RLS saknas.

**Snabbtest via `supabase-js` (kör i Node/REPL eller en liten scriptfil):**

```ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(url, anonKey)

// Som anon: ska bara se public/published data enligt policy
const { data: products, error } = await supabase
  .from('Product')
  .select('id,title,published')
  .eq('published', false)

console.log({ products, error })
```

Förväntat: `products` blir `[]` (eller `null` + error om ni saknar select-policy).

### 3) Verifiera admin-path (authenticated)

- Logga in med en användare vars email finns i `public.admin_allowlist`.
- Kör sedan t.ex. en insert/update via Supabase och verifiera att det funkar.

Exempel (efter inlogg):

```ts
await supabase.auth.signInWithPassword({ email, password })

const { error } = await supabase
  .from('Category')
  .insert({ name: 'Testkategori', slug: 'testkategori' })

console.log({ error })
```

Förväntat: som admin ska det gå igenom; som icke-admin ska det bli “permission denied”/RLS error.

## Hardening-rekommendationer

- Rate limit `/admin/login` och `/admin/mfa` (t.ex. via Netlify/edge eller extern ratelimit-tjänst)
- Audit logga admin-mutationer ("vem gjorde vad")
- Säkerhetsheaders (HSTS, no-sniff, frame-ancestors) – se `next.config.ts`
- Sätt `ADMIN_EMAILS` till en minimal allowlist och håll admin-konton separata från vanliga kundkonton
