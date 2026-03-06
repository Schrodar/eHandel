'use server';

/**
 * Server Actions fÃ¶r variant media operations.
 * Kan anropas frÃ¥n client-komponenter.
 */

import { prisma } from '@/lib/prisma';
import { canActivateVariant, type VariantWithImages } from '@/lib/mediaPolicy';
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
  const { canActivate, reason } = canActivateVariant(variantWithImages as VariantWithImages);
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
 * Set (replace) the single image for a variant.
 *
 * AffÃ¤rsregel: en variant har exakt 0 eller 1 bild (role='primary').
 *
 * ROOT CAUSE FIX: det gamla flÃ¶det kallade create() utan att kontrollera om
 * en rad redan existerade, vilket orsakade P2002 pÃ¥ bÃ¥de (variantId, role)
 * och (variantId, assetId)-constraints.
 *
 * LÃ¶sning: atomisk transaktion med deleteMany + create.
 *  - Om ingen rad finns: create skapar den.
 *  - Om samma assetId finns: delete + re-create med rÃ¤tt data.
 *  - Om annan assetId finns: delete gammal, create ny.
 *  - Dubbel submit: andra anropet hittar 0 rader efter delete, create skapar 1 rad. OK.
 */
export async function setVariantImageAction(
  variantId: string,
  assetId: string,
) {
  await prisma.$transaction([
    // Ta bort befintlig bild (0 eller 1 rad) â€“ fÃ¶rhindrar bÃ¥da P2002-constraints
    prisma.variantImage.deleteMany({ where: { variantId } }),
    // Skapa ny enda bild som primary
    prisma.variantImage.create({
      data: { variantId, assetId, role: 'primary', sortOrder: 0 },
    }),
  ]);

  revalidatePath('/admin/products');
  return { success: true };
}

/**
 * Remove the image from a variant.
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

// ---------------------------------------------------------------------------
// Legacy actions kept for backward compatibility (no longer called from UI).
// ---------------------------------------------------------------------------

/** @deprecated Use setVariantImageAction instead. */
export async function addVariantImageAction(
  variantId: string,
  assetId: string,
  setPrimary?: boolean,
) {
  return setVariantImageAction(variantId, assetId);
}

/** @deprecated No longer needed â€“ every variant has at most one (primary) image. */
export async function setVariantImagePrimaryAction(
  variantId: string,
  assetId: string,
) {
  // No-op: the single VariantImage row is always role='primary'.
  revalidatePath('/admin/products');
  return { success: true };
}

/** @deprecated No longer needed â€“ reordering requires multiple images. */
export async function reorderVariantImagesAction(
  variantId: string,
  assetIds: string[],
) {
  // No-op for backward compat.
  return { success: true };
}
