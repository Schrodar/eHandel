'use server';

import { Prisma } from '@prisma/client';
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

function parseOptionalPriceSek(
  value: string | null,
  errors: Record<string, string>,
  fieldKey: string,
): number | null {
  if (!value || !value.trim()) return null;
  const normalized = value.replace(',', '.');
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) {
    errors[fieldKey] = 'Ogiltigt prisvärde';
    return null;
  }
  return Math.round(parsed * 100);
}

function parseImagesText(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
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
  // Publishing is handled via the explicit Publish action, after variants exist.
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

  const priceInCents = parseOptionalPriceSek(priceSekRaw, errors, 'priceSek');

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
      priceInCents: priceInCents ?? undefined,
      priceClass,
      season,
      canonicalImage,
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

  const priceInCents = parseOptionalPriceSek(priceSekRaw, errors, 'priceSek');

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
      priceInCents: priceInCents ?? null,
      priceClass,
      season,
      canonicalImage,
    },
  });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath(`/admin/products/${id}`);
  revalidatePath('/admin');

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
  const basePriceInCents = product.priceInCents ?? null;
  const hasReadyVariants =
    activeVariants.length > 0 &&
    activeVariants.every((v) => {
      const hasEffectiveImages = Boolean(v.images) || Boolean(product.canonicalImage);
      const hasEffectivePrice = (v.priceInCents ?? basePriceInCents) != null;
      return v.sku && v.stock >= 0 && hasEffectiveImages && hasEffectivePrice;
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
  const id = ((formData.get('id') as string | null) || '').trim();
  if (!id) redirect('/admin/products?error=missing-id');

  await prisma.product.delete({ where: { id } });

  revalidatePath('/admin/products');
  revalidatePath('/shop');
  revalidatePath('/admin');

  redirect('/admin/products');
}

export async function createVariant(formData: FormData) {
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!productId) redirect('/admin/products?error=missing-product');

  const errors: Record<string, string> = {};

  const skuRaw = ((formData.get('sku') as string | null) || '').trim();
  const colorId =
    ((formData.get('colorId') as string | null) || '').trim() || null;
  const stockRaw = (formData.get('stock') as string | null) ?? '0';
  const active = parseBooleanField(formData.get('active'));
  const priceOverrideSekRaw =
    (formData.get('priceOverrideSek') as string | null) ?? null;
  const imagesText = ((formData.get('imagesText') as string | null) || '').trim();
  const imagesJson = ((formData.get('imagesJson') as string | null) || '').trim();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, canonicalImage: true, priceInCents: true },
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

  let images: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null =
    null;
  if (imagesText) {
    const parsed = parseImagesText(imagesText);
    if (parsed.length === 0) {
      errors.imagesText = 'Ange minst en bild-URL per rad, eller lämna tomt';
    } else {
      images = parsed;
    }
  } else if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (
        Array.isArray(parsed) &&
        parsed.every((v) => typeof v === 'string' && v.trim())
      ) {
        images = parsed;
      } else {
        errors.imagesJson =
          'Images måste vara en JSON-array med strängar (t.ex. ["/img1.jpg"])';
      }
    } catch {
      errors.imagesJson =
        'Images måste vara giltig JSON (t.ex. ["/img1.jpg"])';
    }
  }

  if (active) {
    const hasEffectiveImages =
      (Array.isArray(images) && images.length > 0) || Boolean(product.canonicalImage);
    if (!hasEffectiveImages) {
      errors.imagesText =
        'Aktiva varianter måste ha minst en bild (ange bilder på varianten eller sätt produktens canonical image)';
    }

    const hasEffectivePrice = (priceInCents ?? product.priceInCents) != null;
    if (!hasEffectivePrice) {
      errors.priceOverrideSek =
        'Aktiva varianter måste ha pris (ange variantpris eller produktens fallback-pris)';
    }
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
      images: images ?? undefined,
      active,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/admin');

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
  const imagesText = ((formData.get('imagesText') as string | null) || '').trim();
  const imagesJson = ((formData.get('imagesJson') as string | null) || '').trim();

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

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { priceInCents: true, canonicalImage: true },
  });
  if (!product) redirect('/admin/products?error=missing-product');

  let images: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | null =
    null;
  if (imagesText) {
    const parsed = parseImagesText(imagesText);
    if (parsed.length === 0) {
      errors.imagesText = 'Ange minst en bild-URL per rad, eller lämna tomt';
    } else {
      images = parsed;
    }
  } else if (imagesJson) {
    try {
      const parsed = JSON.parse(imagesJson);
      if (
        Array.isArray(parsed) &&
        parsed.every((v) => typeof v === 'string' && v.trim())
      ) {
        images = parsed;
      } else {
        errors.imagesJson =
          'Images måste vara en JSON-array med strängar (t.ex. ["/img1.jpg"])';
      }
    } catch {
      errors.imagesJson =
        'Images måste vara giltig JSON (t.ex. ["/img1.jpg"])';
    }
  }

  if (active) {
    const hasEffectiveImages =
      (Array.isArray(images) && images.length > 0) || Boolean(product.canonicalImage);
    if (!hasEffectiveImages) {
      errors.imagesText =
        'Aktiva varianter måste ha minst en bild (ange bilder på varianten eller sätt produktens canonical image)';
    }

    const hasEffectivePrice = (priceInCents ?? product.priceInCents) != null;
    if (!hasEffectivePrice) {
      errors.priceOverrideSek =
        'Aktiva varianter måste ha pris (ange variantpris eller produktens fallback-pris)';
    }
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
      // If empty, we clear images to allow inheriting product fallback images.
      images:
        imagesText || imagesJson ? (images ?? Prisma.DbNull) : Prisma.DbNull,
      active,
    },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath('/admin/products');
  revalidatePath('/admin');

  redirect(`/admin/products/${productId}?tab=variants`);
}

export async function toggleVariantActive(formData: FormData) {
  const id = ((formData.get('id') as string | null) || '').trim();
  const productId = ((formData.get('productId') as string | null) || '').trim();
  if (!id || !productId) redirect('/admin/products?error=missing-variant');

  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) redirect('/admin/products?error=missing-variant');

  // Defensive: avoid toggling a variant through the wrong product context.
  if (variant.productId !== productId) {
    redirect(`/admin/products/${productId}?tab=variants&error=variant-product-mismatch`);
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) redirect('/admin/products?error=missing-product');

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
    if (!variant.images && !product.canonicalImage) {
      redirect(
        `/admin/products/${productId}?tab=variants&error=images-missing`,
      );
    }
    if ((variant.priceInCents ?? product.priceInCents) == null) {
      redirect(`/admin/products/${productId}?tab=variants&error=price-missing`);
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
