import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import {
  createVariant,
  publishProduct,
  toggleVariantActive,
  unpublishProduct,
  updateProduct,
  updateVariant,
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

  const [product, categories, materials, colors] = await Promise.all([
    prisma.product.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        category: true,
        material: true,
        variants: {
          include: {
            color: true,
          },
          orderBy: { sku: 'asc' },
        },
      },
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.material.findMany({ orderBy: { name: 'asc' } }),
    prisma.color.findMany({ orderBy: { name: 'asc' } }),
  ]);

  if (!product) {
    notFound();
  }

  const activeVariants = product.variants.filter((v) => v.active);
  const activeStocks = activeVariants
    .map((v) => (typeof v.stock === 'number' ? v.stock : 0))
    .filter((n) => Number.isFinite(n));
  const minActiveStock = activeStocks.length > 0 ? Math.min(...activeStocks) : null;
  const klarnaReady =
    product.published &&
    activeVariants.length > 0 &&
    activeVariants.every(
      (v) =>
        v.sku &&
        v.stock >= 0 &&
        (v.images || product.canonicalImage) &&
        (v.priceInCents ?? product.priceInCents) !== null &&
        (v.priceInCents ?? product.priceInCents) !== undefined,
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
          {product.published ? (
            <form action={unpublishProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-800 hover:bg-slate-50 md:w-auto"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publishProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-emerald-700 md:w-auto"
              >
                Publish
              </button>
            </form>
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
                    Kräver minst 1 aktiv variant med SKU, stock ≥ 0, bilder
                    (antingen på varianten eller produktens canonical image) och
                    pris (antingen på varianten eller produktens fallback-pris).
                  </div>
                </div>
              ) : error === 'price-missing' ? (
                <div>
                  <div className="font-semibold">Pris saknas</div>
                  <div className="mt-1">
                    Sätt baspris på produkten eller pris-override på varianten.
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

          <form
            id="product-update-form"
            action={updateProduct}
            className="space-y-6 rounded-xl border border-slate-200 bg-white p-4 text-sm md:p-6"
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
            <h2 className="text-sm font-semibold text-slate-900">Klassning</h2>
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
            <h2 className="text-sm font-semibold text-slate-900">Media</h2>
            <div className="grid max-w-full gap-4 md:max-w-xl">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  Canonical image URL
                </label>
                <input
                  type="text"
                  name="canonicalImage"
                  defaultValue={product.canonicalImage ?? ''}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Valfritt. Kan användas som fallback-bild för varianter utan egna bilder.
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

          </form>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            {product.published ? (
              <form action={unpublishProduct}>
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  Unpublish
                </button>
              </form>
            ) : (
              <form action={publishProduct}>
                <input type="hidden" name="id" value={product.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Publish
                </button>
              </form>
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
                  <div className="mt-1">Kontrollera variantfält och försök igen.</div>
                </div>
              ) : error === 'sku-duplicate' ? (
                <div>
                  <div className="font-semibold">SKU krockar</div>
                  <div className="mt-1">Det finns redan en variant med samma SKU.</div>
                </div>
              ) : error === 'sku-missing' ? (
                <div>
                  <div className="font-semibold">SKU saknas</div>
                  <div className="mt-1">SKU krävs för att aktivera en variant.</div>
                </div>
              ) : error === 'images-missing' ? (
                <div>
                  <div className="font-semibold">Bilder saknas</div>
                  <div className="mt-1">Aktiva varianter måste ha minst en bild.</div>
                </div>
              ) : error === 'price-missing' ? (
                <div>
                  <div className="font-semibold">Pris saknas</div>
                  <div className="mt-1">Sätt baspris på produkten eller pris-override på varianten.</div>
                </div>
              ) : error === 'stock-negative' ? (
                <div>
                  <div className="font-semibold">Ogiltigt lagersaldo</div>
                  <div className="mt-1">Stock måste vara ≥ 0 för att aktivera en variant.</div>
                </div>
              ) : error === 'variant-product-mismatch' ? (
                <div>
                  <div className="font-semibold">Fel produktkontext</div>
                  <div className="mt-1">Försök ladda om sidan och försök igen.</div>
                </div>
              ) : error === 'toggle-failed' ? (
                <div>
                  <div className="font-semibold">Kunde inte uppdatera variant</div>
                  <div className="mt-1">Försök igen. Om felet kvarstår, kontrollera databasen/loggar.</div>
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
                  const imagesRaw = v.images;
                  const images = Array.isArray(imagesRaw)
                    ? imagesRaw.filter(
                        (img): img is string => typeof img === 'string',
                      )
                    : [];
                  const firstImage = images[0];
                  const hasOwnImages = images.length > 0;
                  const hasEffectiveImages =
                    hasOwnImages || Boolean(product.canonicalImage);
                  const isEditing = editVariantId === v.id;
                  const editHref = `/admin/products/${product.id}?tab=variants&editVariant=${encodeURIComponent(
                    v.id,
                  )}`;
                  const cancelHref = `/admin/products/${product.id}?tab=variants`;
                  const imagesTextDefault = hasOwnImages ? images.join('\n') : '';
                  const priceOverrideSekDefault =
                    v.priceInCents != null ? (v.priceInCents / 100).toFixed(2) : '';
                  const effectivePriceInCents = v.priceInCents ?? product.priceInCents;
                  const priceDisplaySek =
                    effectivePriceInCents != null
                      ? (effectivePriceInCents / 100).toFixed(2)
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
                              {hasOwnImages ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={firstImage}
                                  alt={v.sku}
                                  className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200"
                                />
                              ) : product.canonicalImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={product.canonicalImage}
                                  alt={v.sku}
                                  className="h-10 w-10 rounded-md object-cover ring-1 ring-slate-200 opacity-80"
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
                                {v.color?.name ?? '–'} · Stock {v.stock} · {priceDisplaySek} kr
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
                            <div className="mt-0.5 break-words font-mono text-[11px] text-slate-700">
                              {v.id}
                            </div>
                          </div>
                          {!hasEffectiveImages && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-800">
                              Saknar bilder (krävs för aktiv variant).
                            </div>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2">
                          <form action={toggleVariantActive}>
                            <input type="hidden" name="id" value={v.id} />
                            <input
                              type="hidden"
                              name="productId"
                              value={product.id}
                            />
                            <button
                              type="submit"
                              className={
                                v.active
                                  ? 'w-full rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100'
                                  : 'w-full rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200'
                              }
                            >
                              {v.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </form>

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
                            <form action={updateVariant} className="grid gap-3 md:grid-cols-3">
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

                              <div className="md:col-span-2">
                                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                  Images (en per rad)
                                </label>
                                <textarea
                                  name="imagesText"
                                  rows={2}
                                  placeholder="/images/variant1.jpg"
                                  defaultValue={imagesTextDefault}
                                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                />
                                <p className="mt-1 text-[10px] text-slate-500">
                                  Tomt = använd produktens canonical image som fallback.
                                </p>
                              </div>

                              <div className="flex items-end gap-2">
                                <label className="flex items-center gap-1 text-[11px] text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="active"
                                    defaultChecked={v.active}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                  />
                                  Active
                                </label>
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
                                  Spara variant
                                </button>
                              </div>
                            </form>
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
                    const imagesRaw = v.images;
                    const images = Array.isArray(imagesRaw)
                      ? imagesRaw.filter(
                          (img): img is string => typeof img === 'string',
                        )
                      : [];
                    const firstImage = images[0];
                    const hasOwnImages = images.length > 0;
                    const hasEffectiveImages =
                      hasOwnImages || Boolean(product.canonicalImage);
                    const isEditing = editVariantId === v.id;
                    const editHref = `/admin/products/${product.id}?tab=variants&editVariant=${encodeURIComponent(
                      v.id,
                    )}`;
                    const cancelHref = `/admin/products/${product.id}?tab=variants`;
                    const imagesTextDefault = hasOwnImages ? images.join('\n') : '';
                    const priceOverrideSekDefault =
                      v.priceInCents != null ? (v.priceInCents / 100).toFixed(2) : '';

                    const effectivePriceInCents = v.priceInCents ?? product.priceInCents;
                    const effectivePriceLabel =
                      effectivePriceInCents != null
                        ? (effectivePriceInCents / 100).toFixed(2)
                        : '—';

                    return (
                      <Fragment key={v.id}>
                        <tr className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2">
                            {hasOwnImages ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={firstImage}
                                alt={v.sku}
                                className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-200"
                              />
                            ) : product.canonicalImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.canonicalImage}
                                alt={v.sku}
                                className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-200 opacity-80"
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
                              {!hasEffectiveImages && (
                                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  No images
                                </span>
                              )}
                              {v.stock === 0 && (
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                  Stock 0
                                </span>
                              )}
                              {v.priceInCents == null && product.priceInCents != null && (
                                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                  Inherited price
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <form action={toggleVariantActive}>
                              <input type="hidden" name="id" value={v.id} />
                              <input
                                type="hidden"
                                name="productId"
                                value={product.id}
                              />
                              <button
                                type="submit"
                                className={
                                  v.active
                                    ? 'rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100'
                                    : 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200'
                                }
                              >
                                {v.active ? 'Deactivate' : 'Activate'}
                              </button>
                            </form>
                          </td>
                          <td className="px-3 py-2 text-right">
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

                                <div className="sm:col-span-2">
                                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                                    Images (en per rad)
                                  </label>
                                  <textarea
                                    name="imagesText"
                                    rows={2}
                                    placeholder="/images/variant1.jpg"
                                    defaultValue={imagesTextDefault}
                                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                                  />
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    Tomt = använd produktens canonical image som fallback.
                                  </p>
                                </div>

                                <div className="flex items-end gap-2">
                                  <label className="flex items-center gap-1 text-[11px] text-slate-700">
                                    <input
                                      type="checkbox"
                                      name="active"
                                      defaultChecked={v.active}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                    />
                                    Active
                                  </label>
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
                  Auto: {product.slug.toUpperCase()}-COLOR (redigerbar vid behov).
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
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Images (en per rad)
                </label>
                <textarea
                  name="imagesText"
                  rows={2}
                  placeholder="/images/variant1.jpg"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Tomt = använd produktens canonical image som fallback. Krävs för aktiv variant.
                </p>
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-1 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked
                    className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  Active
                </label>
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
          <div className="flex flex-wrap gap-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Canonical image
              </h3>
              {product.canonicalImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.canonicalImage}
                  alt={product.name}
                  className="h-32 w-32 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                  Ingen bild
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Variantbilder (snabbvy)
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.variants.flatMap((v) => {
                  const imagesRaw = v.images;
                  if (!Array.isArray(imagesRaw)) return [];
                  const images = imagesRaw.filter(
                    (img): img is string => typeof img === 'string',
                  );
                  return images.map((img, index) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${v.id}-${index}`}
                      src={img}
                      alt={v.sku}
                      className="h-16 w-16 rounded-md object-cover ring-1 ring-slate-200"
                    />
                  ));
                })}
                {product.variants.every((v) => !v.images) && (
                  <p className="text-xs text-slate-500">
                    Inga variantbilder ännu.
                  </p>
                )}
              </div>
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
