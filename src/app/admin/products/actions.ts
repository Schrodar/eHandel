'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function parseBooleanField(value: FormDataEntryValue | null): boolean {
  if (!value) return false;
  if (typeof value === 'string') {
    return value === 'true' || value === 'on' || value === '1';
  }
  return false;
}

function parsePriceSek(
  value: string | null,
  errors: Record<string, string>,
  fieldKey: string,
): number | null {
  if (!value || !value.trim()) {
    errors[fieldKey] = 'Pris är obligatoriskt';
    return null;
  }
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) {
    errors[fieldKey] = 'Ogiltigt prisvärde';
    return null;
  }
  return Math.round(parsed * 100);
}

export async function createProduct(formData: FormData) {
  const errors: Record<string, string> = {};

  const name = ((formData.get('name') as string | null) || '').trim();
  const rawSlug = ((formData.get('slug') as string | null) || '').trim();
  const description =
    ((formData.get('description') as string | null) || '').trim() || null;
  const categoryId = (
    (formData.get('categoryId') as string | null) || ''
  ).trim();
  const materialId = (
    (formData.get('materialId') as string | null) || ''
  ).trim();
  const priceClass =
    ((formData.get('priceClass') as string | null) || '').trim() || 'standard';
  const season =
    ((formData.get('season') as string | null) || '').trim() || 'all';
  const canonicalImage =
    ((formData.get('canonicalImage') as string | null) || '').trim() || null;
  const published = parseBooleanField(formData.get('published'));
  const priceSekRaw = (formData.get('priceSek') as string | null) ?? null;
  const next = ((formData.get('next') as string | null) || 'overview').trim();

  if (!name) {
    errors.name = 'Namn är obligatoriskt';
  }
  if (!categoryId) {
    errors.categoryId = 'Kategori är obligatorisk';
  }
  if (!materialId) {
    errors.materialId = 'Material är obligatoriskt';
  }

  const slug = rawSlug || slugify(name);
  if (!slug) {
    errors.slug = 'Slug kunde inte genereras';
  }

  const priceInCents = parsePriceSek(priceSekRaw, errors, 'priceSek');

  if (published && !canonicalImage) {
    errors.canonicalImage = 'Canonical image krävs för published produkter';
  }

  if (Object.keys(errors).length > 0 || priceInCents === null || !slug) {
    redirect('/admin/products/new?error=validation');
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    redirect('/admin/products/new?error=slug');
  }

  const product = await prisma.product.create({
    data: {
      // använd slug som id för admin-skapade produkter om inget id skickas in
      id: ((formData.get('id') as string | null) || slug).trim(),
      name,
      slug,
      description,
      categoryId,
      materialId,
      priceInCents,
      priceClass,
      season,
      canonicalImage,
      published,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');

  const target =
    next === 'variants'
      ? `/admin/products/${product.id}?tab=variants`
      : `/admin/products/${product.id}`;

  redirect(target);
}

export async function updateProduct(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) {
    redirect('/admin/products?error=missing-id');
  }

  const errors: Record<string, string> = {};

  const name = ((formData.get('name') as string | null) || '').trim();
  const rawSlug = ((formData.get('slug') as string | null) || '').trim();
  const description =
    ((formData.get('description') as string | null) || '').trim() || null;
  const categoryId = (
    (formData.get('categoryId') as string | null) || ''
  ).trim();
  const materialId = (
    (formData.get('materialId') as string | null) || ''
  ).trim();
  const priceClass =
    ((formData.get('priceClass') as string | null) || '').trim() || 'standard';
  const season =
    ((formData.get('season') as string | null) || '').trim() || 'all';
  const canonicalImage =
    ((formData.get('canonicalImage') as string | null) || '').trim() || null;
  const published = parseBooleanField(formData.get('published'));
  const priceSekRaw = (formData.get('priceSek') as string | null) ?? null;

  if (!name) {
    errors.name = 'Namn är obligatoriskt';
  }
  if (!categoryId) {
    errors.categoryId = 'Kategori är obligatorisk';
  }
  if (!materialId) {
    errors.materialId = 'Material är obligatoriskt';
  }

  const slug = rawSlug || slugify(name);
  if (!slug) {
    errors.slug = 'Slug kunde inte genereras';
  }

  const priceInCents = parsePriceSek(priceSekRaw, errors, 'priceSek');

  if (published && !canonicalImage) {
    errors.canonicalImage = 'Canonical image krävs för published produkter';
  }

  if (Object.keys(errors).length > 0 || priceInCents === null || !slug) {
    redirect(`/admin/products/${id}?tab=overview&error=validation`);
  }

  const existingWithSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingWithSlug && existingWithSlug.id !== id) {
    redirect(`/admin/products/${id}?tab=overview&error=slug`);
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      description,
      categoryId,
      materialId,
      priceInCents,
      priceClass,
      season,
      canonicalImage,
      published,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);

  redirect(`/admin/products/${id}?tab=overview`);
}

export async function publishProduct(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });

  if (!product) {
    redirect('/admin/products?error=missing-product');
  }

  const activeVariants = product.variants.filter((v) => v.active);
  const hasCanonical = !!product.canonicalImage;
  const hasReadyVariants =
    activeVariants.length > 0 &&
    activeVariants.every(
      (v) =>
        v.sku &&
        v.stock >= 0 &&
        v.images &&
        v.priceInCents !== null &&
        v.priceInCents !== undefined,
    );

  if (!hasCanonical || !hasReadyVariants) {
    redirect(`/admin/products/${id}?tab=overview&error=publish-blocked`);
  }

  await prisma.product.update({
    where: { id },
    data: { published: true },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);

  redirect(`/admin/products/${id}`);
}

export async function unpublishProduct(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  await prisma.product.update({
    where: { id },
    data: { published: false },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);

  redirect(`/admin/products/${id}`);
}

export async function createVariant(formData: FormData) {
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!productId) redirect('/admin/products?error=missing-product');

  const errors: Record<string, string> = {};

  const sku = ((formData.get('sku') as string | null) || '').trim();
  const colorId =
    ((formData.get('colorId') as string | null) || '').trim() || null;
  const stockRaw = (formData.get('stock') as string | null) ?? '0';
  const active = parseBooleanField(formData.get('active'));
  const priceOverrideSekRaw =
    (formData.get('priceOverrideSek') as string | null) ?? null;
  const imagesJson = (
    (formData.get('imagesJson') as string | null) || ''
  ).trim();

  if (!sku) {
    errors.sku = 'SKU är obligatoriskt';
  }

  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Stock måste vara ett heltal ≥ 0';
  }

  let priceInCents: number | null = null;
  if (priceOverrideSekRaw && priceOverrideSekRaw.trim()) {
    priceInCents = parsePriceSek(
      priceOverrideSekRaw,
      errors,
      'priceOverrideSek',
    );
  }

  let images: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null =
    null;
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      images = parsed;
    } catch {
      errors.imagesJson =
        'Images måste vara giltig JSON (t.ex. [\"/img1.jpg\"])';
    }
  }

  if (active && !images) {
    errors.imagesJson = 'Aktiva varianter måste ha minst en bild';
  }

  if (Object.keys(errors).length > 0) {
    redirect(
      `/admin/products/${productId}?tab=variants&error=variant-validation`,
    );
  }

  const existingSku = await prisma.productVariant.findUnique({
    where: { sku },
  });
  if (existingSku) {
    redirect(`/admin/products/${productId}?tab=variants&error=sku-duplicate`);
  }

  await prisma.productVariant.create({
    data: {
      // använd sku som id för enkel, stabil identifierare
      id: sku,
      productId,
      sku,
      colorId: colorId || undefined,
      stock,
      priceInCents: priceInCents ?? undefined,
      images: images ?? undefined,
      active,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');

  redirect(`/admin/products/${productId}?tab=variants`);
}

export async function updateVariant(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!id || !productId) redirect('/admin/products?error=missing-variant');

  const errors: Record<string, string> = {};

  const sku = ((formData.get('sku') as string | null) || '').trim();
  const colorId =
    ((formData.get('colorId') as string | null) || '').trim() || null;
  const stockRaw = (formData.get('stock') as string | null) ?? '0';
  const active = parseBooleanField(formData.get('active'));
  const priceOverrideSekRaw =
    (formData.get('priceOverrideSek') as string | null) ?? null;
  const imagesJson = (
    (formData.get('imagesJson') as string | null) || ''
  ).trim();

  if (!sku) {
    errors.sku = 'SKU är obligatoriskt';
  }

  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.stock = 'Stock måste vara ett heltal ≥ 0';
  }

  let priceInCents: number | null = null;
  if (priceOverrideSekRaw && priceOverrideSekRaw.trim()) {
    priceInCents = parsePriceSek(
      priceOverrideSekRaw,
      errors,
      'priceOverrideSek',
    );
  }

  let images: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null =
    null;
  if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      images = parsed;
    } catch {
      errors.imagesJson =
        'Images måste vara giltig JSON (t.ex. [\"/img1.jpg\"])';
    }
  }

  if (active && !images) {
    errors.imagesJson = 'Aktiva varianter måste ha minst en bild';
  }

  if (Object.keys(errors).length > 0) {
    redirect(
      `/admin/products/${productId}?tab=variants&error=variant-validation`,
    );
  }

  const existingSku = await prisma.productVariant.findUnique({
    where: { sku },
  });
  if (existingSku && existingSku.id !== id) {
    redirect(`/admin/products/${productId}?tab=variants&error=sku-duplicate`);
  }

  await prisma.productVariant.update({
    where: { id },
    data: {
      sku,
      colorId: colorId || undefined,
      stock,
      priceInCents: priceInCents ?? undefined,
      images: images ?? undefined,
      active,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');

  redirect(`/admin/products/${productId}?tab=variants`);
}

export async function toggleVariantActive(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!id || !productId) redirect('/admin/products?error=missing-variant');

  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) redirect('/admin/products?error=missing-variant');

  const nextActive = !variant.active;

  if (nextActive) {
    if (!variant.sku) {
      redirect(`/admin/products/${productId}?tab=variants&error=sku-missing`);
    }
    if (variant.stock < 0) {
      redirect(
        `/admin/products/${productId}?tab=variants&error=stock-negative`,
      );
    }
    if (!variant.images) {
      redirect(
        `/admin/products/${productId}?tab=variants&error=images-missing`,
      );
    }
  }

  await prisma.productVariant.update({
    where: { id },
    data: { active: nextActive },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');

  redirect(`/admin/products/${productId}?tab=variants`);
}
