# Seed data

This folder contains JSON seed files you can import into your database.

Order to import:

1. `colors.json`
2. `categories.json`
3. `materials.json`
4. `products.json`
5. `product_variants.json`

Notes:

- Files use stable slugs for IDs (e.g. `w-001`) so you can link directly from the frontend without extra lookups.
- Images are stored as paths under `public/` (or use absolute URLs).
- Import with your DB tool, or write a small seed script that reads the files and inserts rows in order.
