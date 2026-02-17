import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import AdminForm from '@/components/admin/AdminForm';
import VariantMediaSection from '@/components/admin/VariantMediaSection';
import { canActivateVariant, getPrimaryImage } from '@/lib/mediaPolicy';
import {
  createVariant,
  deleteProduct,
  publishProduct,
  unpublishProduct,
  updateProduct,
  updateVariant,
  setDefaultVariant,
} from '../actions';

type PageProps = {
  // In newer Next.js runtimes, these can be Promises.
  params: { id: string } | Promise<{ id: string }>;
  searchParams?:
    | { [key: string]: string | string[] | undefined }
    | Promise<{ [key: string]: string | string[] | undefined } | undefined>;
};

function toStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export const metadata = {
  title: 'Admin – Produkt',
};

export const dynamic = 'force-dynamic';

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: PageProps) {
  // `params` may be a Promise in newer Next.js runtimes — unwrap it
  // https://nextjs.org/docs/messages/sync-dynamic-apis
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const id = decodeURIComponent(resolvedParams.id);
  const tab = toStringParam(resolvedSearchParams?.tab) ?? 'overview';
  const editVariantId = toStringParam(resolvedSearchParams?.editVariant);
  const error = toStringParam(resolvedSearchParams?.error);

  const needsCategoryMaterialLists = tab === 'overview';
  const needsColorList = tab === 'variants';

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      categoryId: true,
      materialId: true,
      priceInCents: true,
      priceClass: true,
      season: true,
      attributes: true,
      published: true,
      defaultVariantId: true,
      variants: {
        select: {
          id: true,
          sku: true,
          colorId: true,
          color: { select: { id: true, name: true, hex: true } },
          priceInCents: true,
          stock: true,
          active: true,
          variantImages: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sku: 'asc' },
      },
    },
  });

  const categories: Array<{ id: string; name: string }> =
    needsCategoryMaterialLists
      ? await prisma.category.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const materials: Array<{ id: string; name: string }> =
    needsCategoryMaterialLists
      ? await prisma.material.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : [];

  const colors: Array<{ id: string; name: string }> = needsColorList
    ? await prisma.color.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [];

  if (!product) {
    notFound();
  }

  const activeVariants = product.variants.filter((v) => v.active);
  const activeStocks = activeVariants
    .map((v) => (typeof v.stock === 'number' ? v.stock : 0))
    .filter((n) => Number.isFinite(n));
  const minActiveStock =
    activeStocks.length > 0 ? Math.min(...activeStocks) : null;
  const klarnaReady =
    product.published &&
    activeVariants.length > 0 &&
    activeVariants.every(
      (v) =>
        v.sku &&
        v.stock >= 0 &&
        v.priceInCents != null &&
        canActivateVariant(v as any).canActivate,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">
            <Link
              href="/admin/products"
              className="underline-offset-2 hover:underline"
            >
              Produkter
            </Link>{' '}
            / {product.name}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif">{product.name}</h1>
            <span
              className={
                product.published
                  ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                  : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
              }
            >
              {product.published ? 'Published' : 'Draft'}
            </span>
            {klarnaReady && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                Klarna-ready
              </span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center">
          <Link
            href={`/product/${product.slug}`}
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 md:w-auto"
          >
            Preview
          </Link>
          <AdminForm
            action={deleteProduct}
            toastMessage="Borttagen"
            pendingMessage="Tar bort…"
            showOverlay={false}
            confirmMessage="Ar du saker pa att du vill ta bort denna produkt? Detta gar inte att angra."
          >
            <input type="hidden" name="id" value={product.id} />
            <button
              type="submit"
              className="w-full rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-center text-xs font-medium text-rose-700 hover:bg-rose-100 md:w-auto"
            >
              Ta bort
            </button>
          </AdminForm>
          {product.published ? (
            <AdminForm
              action={unpublishProduct}
              toastMessage="Avpublicerad"
              pendingMessage="Avpublicerar…"
              showOverlay={false}
            >
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-800 hover:bg-slate-50 md:w-auto"
              >
                Unpublish
              </button>
            </AdminForm>
          ) : (
            <AdminForm
              action={publishProduct}
              toastMessage="Publicerad"
              pendingMessage="Publicerar…"
              showOverlay={false}
            >
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-emerald-700 md:w-auto"
              >
                Publish
              </button>
            </AdminForm>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 text-sm">
        <nav className="-mb-px flex flex-wrap gap-4">
          {[
            { id: 'overview', label: 'Översikt' },
            { id: 'variants', label: 'Varianter' },
            { id: 'media', label: 'Media' },
            { id: 'seo', label: 'SEO' },
          ].map((item) => {
            const href = `/admin/products/${product.id}?tab=${item.id}`;
            const isActive = tab === item.id;
            return (
              <Link
                key={item.id}
                href={href}
                className={
                  isActive
                    ? 'border-b-2 border-slate-900 px-1 pb-2 text-sm font-medium text-slate-900'
                    : 'border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-slate-500 hover:text-slate-800'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {error && (
            <div
              className={
                error === 'publish-blocked'
                  ? 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900'
                  : 'rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900'
              }
            >
              {error === 'publish-blocked' ? (
                <div>
                  <div className="font-semibold">Kan inte publicera ännu</div>
                  <div className="mt-1 text-amber-800">
                    Kräver minst 1 aktiv variant med SKU, stock ≥ 0, pris på
                    varianten och giltiga bilder (minst 1 bild + exakt 1
                    primär).
                  </div>
                </div>
              ) : error === 'price-missing' ? (
                <div>
                  <div className="font-semibold">Pris saknas</div>
                  <div className="mt-1">
                    Sätt pris på varianten för att kunna aktivera.
                  </div>
                </div>
              ) : error === 'validation' ? (
                <div>
                  <div className="font-semibold">Valideringsfel</div>
                  <div className="mt-1">
                    Kontrollera fälten och försök igen.
                  </div>
                </div>
              ) : error === 'slug' ? (
                <div>
                  <div className="font-semibold">Slug krockar</div>
                  <div className="mt-1">
                    Det finns redan en annan produkt med samma slug.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold">Något gick fel</div>
                  <div className="mt-1">Fel: {error}</div>
                </div>
              )}
            </div>
          )}

          <AdminForm
            id="product-update-form"
            action={updateProduct}
            className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 text-sm md:p-6"
            toastMessage="Sparat"
            pendingMessage="Sparar…"
            showOverlay={false}
          >
            <input type="hidden" name="id" value={product.id} />
            <input
              type="hidden"
              name="published"
              value={product.published ? '1' : '0'}
            />
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Grund</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={product.name}
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                    Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    defaultValue={product.slug}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={product.description ?? ''}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Klassning
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    defaultValue={product.categoryId}
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                    Material
                  </label>
                  <select
                    name="materialId"
                    defaultValue={product.materialId}
                    required
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <details className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Avancerat
                </summary>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                      PriceClass
                    </label>
                    <input
                      type="text"
                      name="priceClass"
                      defaultValue={product.priceClass}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                      Season
                    </label>
                    <input
                      type="text"
                      name="season"
                      defaultValue={product.season}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    />
                  </div>
                </div>
              </details>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">Pris</h2>
              <div className="grid max-w-full gap-4 md:max-w-sm md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                    Fallback price (SEK)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="priceSek"
                    defaultValue={
                      typeof product.priceInCents === 'number'
                        ? (product.priceInCents / 100).toFixed(2)
                        : ''
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Valfritt. Om tomt krävs pris per aktiv variant.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Status &amp; health checks
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div className="text-slate-700">Status:</div>
                <span
                  className={
                    product.published
                      ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'
                      : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600'
                  }
                >
                  {product.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <ul className="space-y-1 text-xs">
                {product.published && activeVariants.length === 0 && (
                  <li className="text-amber-700">
                    • Published men har 0 aktiva varianter
                  </li>
                )}
                {minActiveStock != null && minActiveStock < 3 && (
                  <li className="text-amber-700">
                    • Lågt lagersaldo (min aktiv variant: {minActiveStock})
                  </li>
                )}
              </ul>
            </section>
          </AdminForm>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            {product.published ? (
              <AdminForm
                action={unpublishProduct}
                toastMessage="Avpublicerad"
                pendingMessage="Avpublicerar…"
                showOverlay={false}
              >
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Unpublish
                </button>
              </AdminForm>
            ) : (
              <AdminForm
                action={publishProduct}
                toastMessage="Publicerad"
                pendingMessage="Publicerar…"
                showOverlay={false}
              >
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Publish
                </button>
              </AdminForm>
            )}

            <button
              type="submit"
              form="product-update-form"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Spara ändringar
            </button>
          </div>
        </div>
      )}

      {tab === 'variants' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 text-sm">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
              {error === 'variant-validation' ? (
                <div>
                  <div className="font-semibold">Valideringsfel</div>
                  <div className="mt-1">
                    Kontrollera variantfält och försök igen.
                  </div>
                </div>
              ) : error === 'sku-duplicate' ? (
                <div>
                  <div className="font-semibold">SKU krockar</div>
                  <div className="mt-1">
                    Det finns redan en variant med samma SKU.
                  </div>
                </div>
              ) : error === 'sku-missing' ? (
                <div>
                  <div className="font-semibold">SKU saknas</div>
                  <div className="mt-1">
                    SKU krävs för att aktivera en variant.
                  </div>
                </div>
              ) : error === 'images-missing' ? (
                <div>
                  <div className="font-semibold">Bilder saknas</div>
                  <div className="mt-1">
                    Aktiva varianter måste ha minst en bild och exakt 1 primär.
                  </div>
                </div>
              ) : error === 'price-missing' ? (
                <div>
                  <div className="font-semibold">Pris saknas</div>
                  <div className="mt-1">
                    Sätt pris på varianten för att kunna aktivera.
                  </div>
                </div>
              ) : error === 'activation-blocked' ? (
                <div>
                  <div className="font-semibold">Kan inte aktivera</div>
                  <div className="mt-1">
                    Kontrollera bilder, primär bild och pris innan aktivering.
                  </div>
                </div>
              ) : error === 'stock-negative' ? (
                <div>
                  <div className="font-semibold">Ogiltigt lagersaldo</div>
                  <div className="mt-1">
                    Stock måste vara ≥ 0 för att aktivera en variant.
                  </div>
                </div>
              ) : error === 'variant-product-mismatch' ? (
                <div>
                  <div className="font-semibold">Fel produktkontext</div>
                  <div className="mt-1">
                    Försök ladda om sidan och försök igen.
                  </div>
                </div>
              ) : error === 'toggle-failed' ? (
                <div>
                  <div className="font-semibold">
                    Kunde inte uppdatera variant
                  </div>
                  <div className="mt-1">
                    Försök igen. Om felet kvarstår, kontrollera
                    databasen/loggar.
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold">Något gick fel</div>
                  <div className="mt-1">Fel: {error}</div>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Varianter</h2>
          </div>

          {product.variants.length === 0 ? (
            <p className="text-xs text-slate-600">Inga varianter ännu.</p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {product.variants.map((v) => {
                  const primaryImage = getPrimaryImage(v as any);
                  const previewUrl =
                    primaryImage?.url || v.variantImages[0]?.asset.url || null;
                  const hasImages = v.variantImages.length > 0;
                  const isEditing = editVariantId === v.id;
                  const editHref = `/admin/products/${product.id}?tab=variants&editVariant=${encodeURIComponent(
                    v.id,
                  )}`;
                  const cancelHref = `/admin/products/${product.id}?tab=variants`;
                  const priceOverrideSekDefault =
                    v.priceInCents != null
                      ? (v.priceInCents / 100).toFixed(2)
                      : '';
                  const priceDisplaySek =
                    v.priceInCents != null
                      ? (v.priceInCents / 100).toFixed(2)
                      : '—';

                  return (
                    <details
                      key={v.id}
                      className="group rounded-xl border border-slate-200 bg-white"
                      open={isEditing}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden [&::marker]:content-none">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0">
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewUrl}
                                  alt={v.sku}
                                  className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] text-slate-400">
                                  No img
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="truncate font-mono text-[11px] text-slate-800">
                                  {v.sku}
                                </div>
                                {product.defaultVariantId === v.id && (
                                  <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                    Default
                                  </span>
                                )}
                                <span
                                  className={
                                    v.active
                                      ? 'inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
                                      : 'inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600'
                                  }
                                >
                                  {v.active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                              <div className="mt-0.5 truncate text-xs text-slate-600">
                                {v.color?.name ?? '–'} · Stock {v.stock} ·{' '}
                                {priceDisplaySek} kr
                              </div>
                            </div>
                          </div>
                        </div>
                        <svg
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                        >
                          <path
                            fill="currentColor"
                            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
                          />
                        </svg>
                      </summary>

                      <div className="border-t border-slate-200 px-4 py-3 text-xs">
                        <div className="grid gap-3 text-slate-700">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Variant ID
                            </div>
                            <div className="mt-0.5 wrap-break-word font-mono text-[11px] text-slate-700">
                              {v.id}
                            </div>
                          </div>
                          {!hasImages && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">
                              Saknar bilder (krävs för aktiv variant).
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {!isEditing && product.defaultVariantId !== v.id && (
                            <form
                              action={setDefaultVariant}
                              className="contents"
                            >
                              <input
                                type="hidden"
                                name="productId"
                                value={product.id}
                              />
                              <input
                                type="hidden"
                                name="variantId"
                                value={v.id}
                              />
                              <button
                                type="submit"
                                className="rounded-full bg-blue-50 px-4 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100"
                              >
                                Set as default
                              </button>
                            </form>
                          )}
                          {isEditing ? (
                            <Link
                              href={cancelHref}
                              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </Link>
                          ) : (
                            <Link
                              href={editHref}
                              className="w-full rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                            >
                              Edit
                            </Link>
                          )}
                        </div>

                        {isEditing && (
                          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <AdminForm
                              action={updateVariant}
                              className="grid gap-3 md:grid-cols-3"
                              toastMessage="Sparat"
                              pendingMessage="Sparar…"
                              showOverlay={false}
                            >
                              <input type="hidden" name="id" value={v.id} />
                              <input
                                type="hidden"
                                name="productId"
                                value={product.id}
                              />

                              <div>
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                  SKU
                                </label>
                                <input
                                  type="text"
                                  name="sku"
                                  required
                                  defaultValue={v.sku}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                  Color
                                </label>
                                <select
                                  name="colorId"
                                  defaultValue={v.colorId ?? ''}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                >
                                  <option value="">Ingen</option>
                                  {colors.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                  Stock
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  name="stock"
                                  defaultValue={v.stock}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                  Price (SEK)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  name="priceOverrideSek"
                                  defaultValue={priceOverrideSekDefault}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                              </div>

                              <div className="md:col-span-3">
                                <VariantMediaSection variant={v} />
                              </div>

                              <div className="flex items-end justify-end gap-2 md:col-span-3">
                                <Link
                                  href={cancelHref}
                                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  Avbryt
                                </Link>
                                <button
                                  type="submit"
                                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                                >
                                  Spara grunduppgifter
                                </button>
                              </div>
                            </AdminForm>
                          </div>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Thumbnail</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Color</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-center">Badges</th>
                      <th className="px-3 py-2 text-center">Active</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => {
                      const primaryImage = getPrimaryImage(v as any);
                      const previewUrl =
                        primaryImage?.url ||
                        v.variantImages[0]?.asset.url ||
                        null;
                      const hasImages = v.variantImages.length > 0;
                      const isEditing = editVariantId === v.id;
                      const editHref = `/admin/products/${product.id}?tab=variants&editVariant=${encodeURIComponent(
                        v.id,
                      )}`;
                      const cancelHref = `/admin/products/${product.id}?tab=variants`;
                      const priceOverrideSekDefault =
                        v.priceInCents != null
                          ? (v.priceInCents / 100).toFixed(2)
                          : '';
                      const effectivePriceLabel =
                        v.priceInCents != null
                          ? (v.priceInCents / 100).toFixed(2)
                          : '—';

                      return (
                        <Fragment key={v.id}>
                          <tr className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2">
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewUrl}
                                  alt={v.sku}
                                  className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-200"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-slate-200 text-[9px] text-slate-400">
                                  No img
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px] text-slate-800">
                              {v.sku}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-700">
                              {v.color?.name ?? '–'}
                            </td>
                            <td className="px-3 py-2 text-right text-[11px] tabular-nums">
                              {v.stock}
                            </td>
                            <td className="px-3 py-2 text-right text-[11px] tabular-nums">
                              {effectivePriceLabel}
                            </td>
                            <td className="px-3 py-2 text-center text-[10px]">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {product.defaultVariantId === v.id && (
                                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                    Default
                                  </span>
                                )}
                                {!hasImages && (
                                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                    No images
                                  </span>
                                )}
                                {v.stock === 0 && (
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                    Stock 0
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={
                                  v.active
                                    ? 'inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700'
                                    : 'inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700'
                                }
                              >
                                {v.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!isEditing &&
                                  product.defaultVariantId !== v.id && (
                                    <form
                                      action={setDefaultVariant}
                                      className="inline"
                                    >
                                      <input
                                        type="hidden"
                                        name="productId"
                                        value={product.id}
                                      />
                                      <input
                                        type="hidden"
                                        name="variantId"
                                        value={v.id}
                                      />
                                      <button
                                        type="submit"
                                        className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100"
                                      >
                                        Set
                                      </button>
                                    </form>
                                  )}
                                {isEditing ? (
                                  <Link
                                    href={cancelHref}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200"
                                  >
                                    Cancel
                                  </Link>
                                ) : (
                                  <Link
                                    href={editHref}
                                    className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-medium text-white hover:bg-slate-800"
                                  >
                                    Edit
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isEditing && (
                            <tr className="border-b border-slate-100 last:border-0">
                              <td colSpan={8} className="px-3 py-3 bg-slate-50">
                                <form
                                  action={updateVariant}
                                  className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-3"
                                >
                                  <input type="hidden" name="id" value={v.id} />
                                  <input
                                    type="hidden"
                                    name="productId"
                                    value={product.id}
                                  />

                                  <div>
                                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                      SKU
                                    </label>
                                    <input
                                      type="text"
                                      name="sku"
                                      required
                                      defaultValue={v.sku}
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                      Color
                                    </label>
                                    <select
                                      name="colorId"
                                      defaultValue={v.colorId ?? ''}
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    >
                                      <option value="">Ingen</option>
                                      {colors.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                      Stock
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      name="stock"
                                      defaultValue={v.stock}
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    />
                                  </div>

                                  <div>
                                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                      Price (SEK)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      name="priceOverrideSek"
                                      defaultValue={priceOverrideSekDefault}
                                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                    />
                                  </div>

                                  <div className="sm:col-span-3">
                                    <VariantMediaSection variant={v} />
                                  </div>

                                  <div className="flex items-end justify-end gap-2 sm:col-span-3">
                                    <Link
                                      href={cancelHref}
                                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      Avbryt
                                    </Link>
                                    <button
                                      type="submit"
                                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                                    >
                                      Spara variant
                                    </button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Skapa variant
            </h3>
            <form
              action={createVariant}
              className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3"
            >
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  placeholder="Lämna tomt = auto (PRODUCT-SLUG + COLOR)"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Auto: {product.slug.toUpperCase()}-COLOR (redigerbar vid
                  behov).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Color
                </label>
                <select
                  name="colorId"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                >
                  <option value="">Ingen</option>
                  {colors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  name="stock"
                  defaultValue={0}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Price (SEK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="priceOverrideSek"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Sätt pris innan varianten kan aktiveras.
                </p>
              </div>
              <div className="flex items-end justify-end md:col-span-3">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Skapa variant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'media' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Mediaöversikt
          </h2>
          <p className="text-xs text-slate-600">
            Media hanteras per variant via Media Library.
          </p>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Variantbilder (snabbvy)
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.flatMap((v) =>
                v.variantImages.map((vi) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${v.id}-${vi.assetId}`}
                    src={vi.asset.url}
                    alt={vi.asset.alt || v.sku}
                    className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200"
                  />
                )),
              )}
              {product.variants.every((v) => v.variantImages.length === 0) && (
                <p className="text-xs text-slate-500">
                  Inga variantbilder ännu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <h2 className="text-sm font-semibold text-slate-900">SEO</h2>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-slate-600">Slug</div>
              <div className="font-mono text-xs text-slate-800">
                {product.slug}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-600">
                Canonical URL
              </div>
              <div className="font-mono text-xs text-slate-800">
                /product/{product.slug}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Meta title/description kan läggas till senare om du vill utöka
              SEO-stödet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
