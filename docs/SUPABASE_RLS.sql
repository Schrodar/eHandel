-- Supabase RLS policies for Utö ehandel
--
-- Notes:
-- - These policies matter when accessing Postgres through Supabase (anon/authenticated roles).
-- - If your app uses Prisma with a privileged DB connection, Prisma bypasses RLS; keep server-side guards too.
-- - MFA/AAL2 cannot be enforced inside Postgres RLS; enforce MFA in the app (already done).
--
-- Run in Supabase SQL editor.

begin;

-- 1) Admin allowlist table (DB-side)
-- Store admin emails here so RLS can gate write access.
create table if not exists public.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;

-- Don’t allow direct reads/writes from anon/authenticated.
revoke all on table public.admin_allowlist from anon, authenticated;

-- Helper: admin check by JWT email.
-- SECURITY DEFINER so it can read admin_allowlist even though table has no grants.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.admin_allowlist a
    where lower(a.email) = lower((auth.jwt() ->> 'email'))
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- 2) Products
-- Public can read only published products.
-- Admin can do everything.
do $$
begin
  if to_regclass('public."Product"') is not null then
    execute 'alter table public."Product" enable row level security';

    -- Drop old policies if rerunning
    execute 'drop policy if exists "public_read_published_products" on public."Product"';
    execute 'drop policy if exists "admin_all_products" on public."Product"';

    execute 'create policy "public_read_published_products" on public."Product"\n'
         || 'for select\n'
         || 'using (published = true)';

    execute 'create policy "admin_all_products" on public."Product"\n'
         || 'for all\n'
         || 'using (public.is_admin())\n'
         || 'with check (public.is_admin())';
  end if;
end $$;

-- 3) Product variants
-- Public can read only active variants, and only for published products.
-- Admin can do everything.
do $$
begin
  if to_regclass('public."ProductVariant"') is not null then
    execute 'alter table public."ProductVariant" enable row level security';

    execute 'drop policy if exists "public_read_active_variants_of_published" on public."ProductVariant"';
    execute 'drop policy if exists "admin_all_variants" on public."ProductVariant"';

    execute 'create policy "public_read_active_variants_of_published" on public."ProductVariant"\n'
         || 'for select\n'
         || 'using (\n'
         || '  active = true\n'
         || '  and exists (\n'
         || '    select 1 from public."Product" p\n'
         || '    where p.id = "ProductVariant"."productId" and p.published = true\n'
         || '  )\n'
         || ')';

    execute 'create policy "admin_all_variants" on public."ProductVariant"\n'
         || 'for all\n'
         || 'using (public.is_admin())\n'
         || 'with check (public.is_admin())';
  end if;
end $$;

-- 4) Lookups (Category/Material/Color)
-- Public can read.
-- Admin can write.
do $$
begin
  if to_regclass('public."Category"') is not null then
    execute 'alter table public."Category" enable row level security';
    execute 'drop policy if exists "public_read_categories" on public."Category"';
    execute 'drop policy if exists "admin_all_categories" on public."Category"';
    execute 'create policy "public_read_categories" on public."Category" for select using (true)';
    execute 'create policy "admin_all_categories" on public."Category" for all using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public."Material"') is not null then
    execute 'alter table public."Material" enable row level security';
    execute 'drop policy if exists "public_read_materials" on public."Material"';
    execute 'drop policy if exists "admin_all_materials" on public."Material"';
    execute 'create policy "public_read_materials" on public."Material" for select using (true)';
    execute 'create policy "admin_all_materials" on public."Material" for all using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public."Color"') is not null then
    execute 'alter table public."Color" enable row level security';
    execute 'drop policy if exists "public_read_colors" on public."Color"';
    execute 'drop policy if exists "admin_all_colors" on public."Color"';
    execute 'create policy "public_read_colors" on public."Color" for select using (true)';
    execute 'create policy "admin_all_colors" on public."Color" for all using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

-- 5) Orders (admin-only by default)
-- Recommended: do NOT expose orders directly to anon/authenticated without a clear ownership model.
-- If you later add a customer auth model, add customer_id and a "select own orders" policy.
do $$
begin
  if to_regclass('public."Order"') is not null then
    execute 'alter table public."Order" enable row level security';
    execute 'drop policy if exists "admin_all_orders" on public."Order"';
    execute 'create policy "admin_all_orders" on public."Order"\n'
         || 'for all using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public."OrderItem"') is not null then
    execute 'alter table public."OrderItem" enable row level security';
    execute 'drop policy if exists "admin_all_order_items" on public."OrderItem"';
    execute 'create policy "admin_all_order_items" on public."OrderItem"\n'
         || 'for all using (public.is_admin()) with check (public.is_admin())';
  end if;
end $$;

commit;

-- After running:
--   insert into public.admin_allowlist(email) values ('you@domain.com');
--   insert into public.admin_allowlist(email) values ('other@domain.com');
