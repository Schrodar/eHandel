'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/adminAuth';
import { canActivateVariant } from '@/lib/mediaPolicy';

async function assertAdmin() {
  // Server actions should be protected even if the UI is protected.
  await requireAdminSession();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function skuPart(value: string): string {
  return slugify(value).replace(/-/g, '').toUpperCase();
}

async function ensureUniqueSku(baseSku: string): Promise<string> {
  const normalized = baseSku.trim();
  if (!normalized) return baseSku;

  // First try the base SKU.
  const existing = await prisma.productVariant.findUnique({
    where: { sku: normalized },
    select: { sku: true },
  });
  if (!existing) return normalized;

  // Then suffix -2, -3, ... to avoid blocking creation.
  for (let i = 2; i <= 50; i++) {
    const candidate = `${normalized}-${i}`;
    const taken = await prisma.productVariant.findUnique({
      where: { sku: candidate },
      select: { sku: true },
    });
    if (!taken) return candidate;
  }

  return `${normalized}-${Date.now()}`;
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
  await assertAdmin();

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
  // Publishing is handled via the explicit Publish action, after variants exist.
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

  if (Object.keys(errors).length > 0 || !slug) {
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
      priceClass,
      season,
      published: false,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/admin');

  const target =
    next === 'variants'
      ? `/admin/products/${product.id}?tab=variants`
      : `/admin/products/${product.id}`;

  redirect(target);
}

export async function updateProduct(formData: FormData) {
  await assertAdmin();

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

  if (Object.keys(errors).length > 0 || !slug) {
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
      priceClass,
      season,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin');

  redirect(`/admin/products/${id}?tab=overview`);
}

export async function publishProduct(formData: FormData) {
  await assertAdmin();

  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          variantImages: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!product) {
    redirect('/admin/products?error=missing-product');
  }

  const activeVariants = product.variants.filter((v) => v.active);
  const hasReadyVariants =
    activeVariants.length > 0 &&
    activeVariants.every((v) => {
      const { canActivate } = canActivateVariant(v as any);
      return v.sku && v.stock >= 0 && canActivate && v.priceInCents != null;
    });

  if (!hasReadyVariants) {
    redirect(`/admin/products/${id}?tab=overview&error=publish-blocked`);
  }

  await prisma.product.update({
    where: { id },
    data: { published: true },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin');

  redirect(`/admin/products/${id}`);
}

export async function unpublishProduct(formData: FormData) {
  await assertAdmin();

  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  await prisma.product.update({
    where: { id },
    data: { published: false },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin');

  redirect(`/admin/products/${id}`);
}

export async function deleteProduct(formData: FormData) {
  await assertAdmin();

  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  await prisma.product.delete({ where: { id } });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/admin');

  redirect('/admin/products');
}

export async function createVariant(formData: FormData) {
  await assertAdmin();

  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!productId) redirect('/admin/products?error=missing-product');

  const errors: Record<string, string> = {};

  const skuRaw = ((formData.get('sku') as string | null) || '').trim();
  const colorId =
    ((formData.get('colorId') as string | null) || '').trim() || null;
  const stockRaw = (formData.get('stock') as string | null) ?? '0';
  const priceOverrideSekRaw =
    (formData.get('priceOverrideSek') as string | null) ?? null;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });
  if (!product) redirect('/admin/products?error=missing-product');

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

  if (Object.keys(errors).length > 0) {
    redirect(
      `/admin/products/${productId}?tab=variants&error=variant-validation`,
    );
  }

  let sku = skuRaw;
  if (!sku) {
    let colorPartValue = 'DEFAULT';
    if (colorId) {
      const color = await prisma.color.findUnique({
        where: { id: colorId },
        select: { name: true, id: true },
      });
      colorPartValue = color?.name || color?.id || colorId;
    }
    const baseSku = `${skuPart(product.slug)}-${skuPart(colorPartValue)}`;
    sku = await ensureUniqueSku(baseSku);
  } else {
    const existingSku = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (existingSku) {
      redirect(`/admin/products/${productId}?tab=variants&error=sku-duplicate`);
    }
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
      active: false,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/admin');

  redirect(
    `/admin/products/${productId}?tab=variants&editVariant=${encodeURIComponent(sku)}`,
  );
}

export async function updateVariant(formData: FormData) {
  await assertAdmin();

  const id = ((formData.get('id') as string | null) || '').trim();
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!id || !productId) redirect('/admin/products?error=missing-variant');

  const errors: Record<string, string> = {};

  const sku = ((formData.get('sku') as string | null) || '').trim();
  const colorId =
    ((formData.get('colorId') as string | null) || '').trim() || null;
  const stockRaw = (formData.get('stock') as string | null) ?? '0';
  const priceOverrideSekRaw =
    (formData.get('priceOverrideSek') as string | null) ?? null;

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
  const existingVariant = await prisma.productVariant.findUnique({
    where: { id },
  });
  if (!existingVariant) redirect('/admin/products?error=missing-variant');

  if (existingVariant.active && priceInCents == null) {
    errors.priceOverrideSek = 'Aktiva varianter måste ha pris';
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
      priceInCents: priceInCents ?? null,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/admin');

  redirect(`/admin/products/${productId}?tab=variants`);
}

export async function toggleVariantActive(formData: FormData) {
  await assertAdmin();

  const id = ((formData.get('id') as string | null) || '').trim();
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!id || !productId) redirect('/admin/products?error=missing-variant');

  const variant = await prisma.productVariant.findUnique({
    where: { id },
    include: {
      variantImages: {
        include: { asset: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!variant) redirect('/admin/products?error=missing-variant');

  // Defensive: avoid toggling a variant through the wrong product context.
  if (variant.productId !== productId) {
    redirect(
      `/admin/products/${productId}?tab=variants&error=variant-product-mismatch`,
    );
  }

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
    const { canActivate } = canActivateVariant(variant as any);
    if (!canActivate) {
      redirect(
        `/admin/products/${productId}?tab=variants&error=activation-blocked`,
      );
    }
  }

  try {
    await prisma.productVariant.update({
      where: { id },
      data: { active: nextActive },
    });
  } catch {
    redirect(`/admin/products/${productId}?tab=variants&error=toggle-failed`);
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/admin');

  redirect(`/admin/products/${productId}?tab=variants`);
}

export async function setDefaultVariant(formData: FormData): Promise<void> {
  await assertAdmin();

  const productId = formData.get('productId') as string;
  const variantId = formData.get('variantId') as string | null;

  if (!productId) {
    throw new Error('Missing productId');
  }

  // Validate that variant belongs to product (if variantId is provided)
  if (variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { productId: true },
    });

    if (!variant || variant.productId !== productId) {
      throw new Error('Variant does not belong to this product');
    }
  }

  await prisma.product.update({
    where: { id: productId },
    data: { defaultVariantId: variantId },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/admin');
}
