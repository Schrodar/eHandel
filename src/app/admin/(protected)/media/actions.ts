'use server';

/**
 * Server Actions för variant media operations.
 * Kan anropas från client-komponenter.
 */

import { prisma } from '@/lib/prisma';
import { canActivateVariant } from '@/lib/mediaPolicy';
import { revalidatePath } from 'next/cache';

/**
 * Activate or deactivate a variant.
 * Validates activation policy if activate=true.
 */
export async function toggleVariantActive(
  variantId: string,
  shouldBeActive: boolean,
) {
  if (!shouldBeActive) {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { active: false },
    });
    revalidatePath('/admin/products');
    return { success: true };
  }

  // Validate policy before activating
  const variant = await prisma.productVariant.findUniqueOrThrow({
    where: { id: variantId },
  });

  const variantImages = await prisma.variantImage.findMany({
    where: { variantId },
    include: { asset: true },
    orderBy: { sortOrder: 'asc' },
  });

  const variantWithImages = { ...variant, variantImages };
  const { canActivate, reason } = canActivateVariant(variantWithImages as any);
  if (!canActivate) {
    throw new Error(`Cannot activate: ${reason}`);
  }

  await prisma.productVariant.update({
    where: { id: variantId },
    data: { active: true },
  });

  revalidatePath('/admin/products');
  return { success: true };
}

/**
 * Add an image to a variant.
 */
export async function addVariantImageAction(
  variantId: string,
  assetId: string,
  setPrimary?: boolean,
) {
  if (setPrimary) {
    await prisma.variantImage.updateMany({
      where: { variantId, role: 'primary' },
      data: { role: 'secondary' },
    });
  }

  await prisma.variantImage.create({
    data: {
      variantId,
      assetId,
      role: setPrimary ? 'primary' : 'secondary',
      sortOrder: 0,
    },
  });

  revalidatePath('/admin/products');
  return { success: true };
}

/**
 * Remove an image from a variant.
 */
export async function removeVariantImageAction(
  variantId: string,
  assetId: string,
) {
  await prisma.variantImage.delete({
    where: {
      variantId_assetId: { variantId, assetId },
    },
  });

  revalidatePath('/admin/products');
  return { success: true };
}

/**
 * Set a specific image as primary.
 */
export async function setVariantImagePrimaryAction(
  variantId: string,
  assetId: string,
) {
  await prisma.variantImage.updateMany({
    where: { variantId, role: 'primary' },
    data: { role: 'secondary' },
  });

  await prisma.variantImage.update({
    where: { variantId_assetId: { variantId, assetId } },
    data: { role: 'primary' },
  });

  revalidatePath('/admin/products');
  return { success: true };
}

/**
 * Reorder images in a variant.
 */
export async function reorderVariantImagesAction(
  variantId: string,
  assetIds: string[],
) {
  for (let i = 0; i < assetIds.length; i++) {
    await prisma.variantImage.update({
      where: { variantId_assetId: { variantId, assetId: assetIds[i]! } },
      data: { sortOrder: i },
    });
  }

  revalidatePath('/admin/products');
  return { success: true };
}
