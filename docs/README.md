# eHandel — Projektöversikt

Detta är en lokal demo-e-handel byggd med Next.js + React. README i `docs/` förklarar projektets syfte, snabbstart, struktur och länkar till viktiga filer och diagram.

## Snabbstart

1. Installera beroenden

```bash
npm install
```

2. Starta utvecklingsservern

```bash
npm run dev
```

Öppna sedan http://localhost:3000 i webbläsaren (beroende på Next.js-konfiguration).

## Vad är i projektet

- Root: `package.json`, `next.config.ts`, `ARCHITECTURE.md`, m.fl.
- `src/`: All appkod — sidor, komponenter, context, hooks och lib.
- `public/`: Statiska filer (bilder, SVG etc.)
- `docs/`: Denna mapp innehåller dokumentation och diagram.

## Diagram

- Strukturdiagram: `docs/structure.svg`
- Interaktionsdiagram: `docs/interactions.svg`

Se filerna i `docs/` för visuella översikter över mappstruktur och hur komponenterna kommunicerar.

## Säkerhet

- Admin security (Supabase Auth + MFA + allowlist): `docs/ADMIN_SECURITY.md`
- Supabase RLS SQL (kör i Supabase SQL editor): `docs/SUPABASE_RLS.sql`

## Viktiga filer och förklaringar

- `src/app/layout.tsx` — Huvudlayout för appen; renderar global struktur (t.ex. `TopNav`).
- `src/app/page.tsx` — Hemsidan (produktlista + hero).
- `src/app/product/page.tsx` — Enskild produktsida.
- `src/components/TopNav.tsx` — Översta navigationsfältet; öppnar kundvagnen.
- `src/components/CartDrawer.tsx` — Kundvagnspanel (drawer) med artiklar och total.
- `src/components/ProductCard.tsx` — Produktkort (bild, pris, ''lägg i kundvagn'').
- `src/components/CheckoutModal.tsx` — Checkoutmodal för betalningsflödet.
- `src/components/TransitionProvider.tsx` — Hjälper med animationer/övergångar.
- `src/components/products.ts` — Statisk produktlista / hjälpfunktioner.
- `src/context/CartProvider.tsx` — React-context som hanterar kundvagnsstate och exponerar `addItem`, `removeItem`, `clearCart`.
- `src/hooks/useCart.ts` — Hook som förenklar konsumtion av `CartProvider`.
- `src/lib/orderStore.ts` — Lättviktig abstraktion för orderhantering/persistens och API-anrop.

## Råd & nästa steg

- Dokumentera `CartProvider`-API mer detaljerat (typdefinitioner och exempel).
- Lägg till en kort CONTRIBUTING.md om du vill att andra ska bidra.
- Vill du ha mer detaljerad filnivå-dokumentation kan jag generera en `docs/files.md` per fil.

---

Genererad: 2026-01-20
