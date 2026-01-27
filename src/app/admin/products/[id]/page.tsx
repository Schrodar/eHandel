import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  createVariant,
  publishProduct,
  toggleVariantActive,
  unpublishProduct,
  updateProduct,
  updateVariant,
} from '../actions';

type PageProps = {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
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

export default async function AdminProductDetailPage({
  params,
  searchParams,
}: PageProps) {
  const id = decodeURIComponent(params.id);
  const tab = toStringParam(searchParams?.tab) ?? 'overview';

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
  const hasCanonical = !!product.canonicalImage;
  const klarnaReady =
    product.published &&
    activeVariants.length > 0 &&
    activeVariants.every(
      (v) =>
        v.sku &&
        v.stock >= 0 &&
        v.images &&
        v.priceInCents !== null &&
        v.priceInCents !== undefined,
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
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/product/${product.slug}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Preview
          </Link>
          {product.published ? (
            <form action={unpublishProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                Unpublish
              </button>
            </form>
          ) : (
            <form action={publishProduct}>
              <input type="hidden" name="id" value={product.id} />
              <button
                type="submit"
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
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
        <form
          action={updateProduct}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 text-sm"
        >
          <input type="hidden" name="id" value={product.id} />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Grund</h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  PriceClass
                </label>
                <input
                  type="text"
                  name="priceClass"
                  defaultValue={product.priceClass}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
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
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Pris</h2>
            <div className="grid max-w-sm gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  Base price (SEK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="priceSek"
                  defaultValue={(product.priceInCents / 100).toFixed(2)}
                  required
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">Media</h2>
            <div className="grid max-w-xl gap-4">
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
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Status &amp; health checks
            </h2>
            <div className="flex items-center gap-2">
              <input
                id="published"
                name="published"
                type="checkbox"
                defaultChecked={product.published}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <label htmlFor="published" className="text-sm text-slate-700">
                Published
              </label>
            </div>
            <ul className="space-y-1 text-xs">
              {product.published && !product.canonicalImage && (
                <li className="text-amber-700">
                  • Published men saknar canonicalImage
                </li>
              )}
              {product.published && activeVariants.length === 0 && (
                <li className="text-amber-700">
                  • Published men har 0 aktiva varianter
                </li>
              )}
            </ul>
          </section>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Spara ändringar
            </button>
          </div>
        </form>
      )}

      {tab === 'variants' && (
        <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 text-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Varianter</h2>
          </div>

          {product.variants.length === 0 ? (
            <p className="text-xs text-slate-600">Inga varianter ännu.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Thumbnail</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2 text-right">Stock</th>
                    <th className="px-3 py-2 text-right">Price override</th>
                    <th className="px-3 py-2 text-center">Badges</th>
                    <th className="px-3 py-2 text-center">Active</th>
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
                    const hasImages = images.length > 0;
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-2">
                          {hasImages ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={firstImage}
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
                          {v.priceInCents != null
                            ? (v.priceInCents / 100).toFixed(2)
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-center text-[10px]">
                          <div className="flex flex-wrap items-center justify-center gap-1">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Skapa variant
            </h3>
            <form
              action={createVariant}
              className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3"
            >
              <input type="hidden" name="productId" value={product.id} />
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  required
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
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
                  Price override (SEK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="priceOverrideSek"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  Images JSON
                </label>
                <textarea
                  name="imagesJson"
                  rows={2}
                  placeholder='["/images/variant1.jpg"]'
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Krävs om varianten ska vara aktiv.
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
              <div className="flex items-end justify-end sm:col-span-3">
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
                    // eslint-disable-next-line react/no-array-index-key, @next/next/no-img-element
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
