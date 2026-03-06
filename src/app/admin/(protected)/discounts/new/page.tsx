import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { DiscountScope, DiscountType, DiscountUsageType } from '@prisma/client';

export const metadata = {
  title: 'Admin – Ny rabattkampanj',
};

async function createDrive(formData: FormData) {
  'use server';
  await requireAdminSession();

  const name = ((formData.get('name') as string) ?? '').trim();
  const scopeType = (formData.get('scopeType') as DiscountScope) ?? DiscountScope.GLOBAL;
  const discountType = (formData.get('discountType') as DiscountType) ?? DiscountType.PERCENT;
  const valueRaw = formData.get('value') as string;
  const minOrderRaw = formData.get('minOrderValue') as string;
  const categoryId = ((formData.get('categoryId') as string) ?? '').trim() || null;
  const productId = ((formData.get('productId') as string) ?? '').trim() || null;
  const variantId = ((formData.get('variantId') as string) ?? '').trim() || null;

  if (!name) return;

  // value is percentage (0–100) for PERCENT, or SEK for AMOUNT, stored in öre
  let value = parseFloat(valueRaw || '0');
  if (discountType === DiscountType.AMOUNT) {
    value = Math.round(value * 100); // kr → öre
  }

  const minOrderValue = minOrderRaw
    ? Math.round(parseFloat(minOrderRaw) * 100)
    : null;

  const drive = await prisma.discountDrive.create({
    data: {
      name,
      scopeType,
      discountType,
      value,
      minOrderValue,
      active: true,
      categoryId,
      productId,
      variantId,
    },
  });

  // Optionally create an initial campaign code
  const initCode = ((formData.get('initCode') as string) ?? '').trim().toUpperCase();
  const initUsageType = ((formData.get('initUsageType') as DiscountUsageType) ?? DiscountUsageType.UNLIMITED);
  const initMaxUsesRaw = formData.get('initMaxUses') as string;
  const initMaxUses = initMaxUsesRaw ? parseInt(initMaxUsesRaw, 10) : null;

  if (initCode.length >= 3) {
    await prisma.discountCode.create({
      data: {
        code: initCode,
        driveId: drive.id,
        usageType: initUsageType,
        maxUses: initUsageType === DiscountUsageType.MAX_USES ? initMaxUses : null,
      },
    });
  }

  revalidatePath('/admin/discounts');
  redirect(`/admin/discounts/${drive.id}`);
}

export default async function NewDiscountPage() {
  await requireAdminSession();

  const [categories, products, variants] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.productVariant.findMany({
      orderBy: { sku: 'asc' },
      select: { id: true, sku: true },
      take: 200,
    }),
  ]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/discounts" className="text-sm text-slate-500 hover:text-slate-800">
          ← Tillbaka
        </Link>
        <h1 className="text-2xl font-serif">Ny rabattkampanj</h1>
      </div>

      <form action={createDrive} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Kampanjnamn <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="t.ex. Sommarrea 2026"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
          <select
            name="scopeType"
            defaultValue="GLOBAL"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="GLOBAL">Hela sortimentet</option>
            <option value="CATEGORY">Specifik kategori</option>
            <option value="PRODUCT">Specifik produkt</option>
            <option value="VARIANT">Specifik variant</option>
          </select>
        </div>

        {/* Scope target (optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Kategori (vid CATEGORY scope)
            </label>
            <select
              name="categoryId"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Produkt (vid PRODUCT scope)
            </label>
            <select
              name="productId"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Variant (vid VARIANT scope)
            </label>
            <select
              name="variantId"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">—</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>{v.sku}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Discount type + value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rabattyp</label>
            <select
              name="discountType"
              defaultValue="PERCENT"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="PERCENT">Procent (%)</option>
              <option value="AMOUNT">Fast belopp (kr)</option>
              <option value="FREE_SHIPPING">Fri frakt</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Värde (% eller kr)
            </label>
            <input
              name="value"
              type="number"
              min="0"
              step="0.01"
              placeholder="t.ex. 10 eller 50"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Min order */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Minsta ordervärde (kr, valfritt)
          </label>
          <input
            name="minOrderValue"
            type="number"
            min="0"
            step="0.01"
            placeholder="t.ex. 500"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        {/* Optional initial campaign code */}
        <fieldset className="rounded-lg border border-slate-200 p-4 space-y-3">
          <legend className="text-sm font-medium text-slate-700 px-1">
            Kampanjkod (valfritt)
          </legend>
          <p className="text-xs text-slate-500">
            Lämna tomt om du vill generera engångskoder senare.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kod</label>
              <input
                name="initCode"
                placeholder="t.ex. SOMMAR25"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Användning</label>
              <select
                name="initUsageType"
                defaultValue="UNLIMITED"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="UNLIMITED">Obegränsad</option>
                <option value="MAX_USES">Max antal</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Max antal (vid MAX_USES)
            </label>
            <input
              name="initMaxUses"
              type="number"
              min="1"
              placeholder="t.ex. 100"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 transition"
        >
          Skapa kampanj
        </button>
      </form>
    </div>
  );
}
