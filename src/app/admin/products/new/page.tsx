import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { createProduct } from '../actions';

export const metadata = {
  title: 'Admin – Skapa produkt',
};

export default async function NewProductPage() {
  const [categories, materials] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.material.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Skapa produkt</h1>
          <p className="mt-1 text-sm text-slate-600">
            Grundinformation för en ny produkt. Pris anges i SEK men sparas i
            öre.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Avbryt
        </Link>
      </div>

      <form
        action={createProduct}
        className="space-y-8 rounded-xl border border-slate-200 bg-white p-4 text-sm md:p-6"
      >
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
                placeholder="auto från name om tomt"
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
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">Välj kategori</option>
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
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">Välj material</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                PriceClass
              </label>
              <input
                type="text"
                name="priceClass"
                placeholder="standard / premium"
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
                placeholder="all / ss24 / aw24"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Pris</h2>
          <div className="grid max-w-full gap-4 md:max-w-sm md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Base price (SEK)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="priceSek"
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
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
                placeholder="/images/produkt.jpg eller full URL"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
              <p className="mt-1 text-xs text-slate-500">
                Krävs om produkten ska publiseras.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Status</h2>
          <div className="flex items-center gap-2">
            <input
              id="published"
              name="published"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <label htmlFor="published" className="text-sm text-slate-700">
              Published
            </label>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/admin/products"
            className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
          >
            Avbryt
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              name="next"
              value="overview"
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:w-auto"
            >
              Spara
            </button>
            <button
              type="submit"
              name="next"
              value="variants"
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
            >
              Spara &amp; lägg till varianter
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
