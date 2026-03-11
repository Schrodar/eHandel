/**
 * src/lib/discounts/resolve.ts
 *
 * Server-side discount resolution — THE single source of truth.
 * Called by:
 *  1. POST /api/discounts/validate  — "Apply" button in cart UI
 *  2. Order creation routes         — compute order.discount / total
 *  3. Stripe session creation       — uses order.total after discount
 *  4. Stripe webhook on CAPTURED    — marks DiscountCode usage idempotently
 */

import { DiscountScope, DiscountType, DiscountUsageType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ResolveCartLine = {
  variantId: string;
  productId: string;
  categoryId: string;
  lineTotal: number; // öre — server-authoritative price × quantity
};

export type AppliedToHint = {
  kind: 'global' | 'category' | 'product' | 'variant';
  label: string;
  shopLink?: string; // /shop?cat=<id> for CATEGORY scope
};

export type ResolveReason =
  | 'NOT_FOUND'
  | 'DRIVE_INACTIVE'
  | 'CODE_EXHAUSTED' // SINGLE_USE already used, or MAX_USES reached
  | 'NOT_APPLICABLE_TO_CART' // scope doesn't match any item in cart
  | 'MIN_ORDER_NOT_MET';

export type ResolveDiscountResult =
  | {
      valid: true;
      code: string;
      driveId: string;
      driveName: string;
      discountAmount: number; // öre ≥ 0, ≤ eligibleSubtotal
      shippingDiscountAmount: number; // öre — for FREE_SHIPPING
      eligibleSubtotal: number;
      appliedToHint: AppliedToHint;
    }
  | {
      valid: false;
      reason: ResolveReason;
      appliedToHint?: AppliedToHint; // present when NOT_APPLICABLE_TO_CART
      requiredMinOrder?: number; // present when MIN_ORDER_NOT_MET
      eligibleSubtotal?: number; // present when MIN_ORDER_NOT_MET
    };

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isCodeExhausted(code: {
  usageType: DiscountUsageType;
  usedAt: Date | null;
  usedCount: number;
  maxUses: number | null;
}): boolean {
  if (code.usageType === DiscountUsageType.SINGLE_USE && code.usedAt !== null)
    return true;
  if (
    code.usageType === DiscountUsageType.MAX_USES &&
    code.maxUses !== null &&
    code.usedCount >= code.maxUses
  )
    return true;
  return false;
}

function buildHint(params: {
  scopeType: DiscountScope;
  driveName: string;
  categoryId: string | null;
  categoryName: string | null;
  productId: string | null;
  productName: string | null;
  variantId: string | null;
  variantSku: string | null;
}): AppliedToHint {
  const {
    scopeType,
    driveName,
    categoryId,
    categoryName,
    productId,
    productName,
    variantId,
    variantSku,
  } = params;

  switch (scopeType) {
    case DiscountScope.CATEGORY:
      return {
        kind: 'category',
        label: categoryName ?? categoryId ?? 'Kategori',
        shopLink: `/shop?cat=${categoryId ?? ''}`,
      };
    case DiscountScope.PRODUCT:
      return {
        kind: 'product',
        label: productName ?? productId ?? 'Produkt',
      };
    case DiscountScope.VARIANT:
      return {
        kind: 'variant',
        label: variantSku ?? variantId ?? 'Variant',
      };
    default:
      return { kind: 'global', label: driveName };
  }
}

// ─── Main resolution function ─────────────────────────────────────────────────

/**
 * Resolve a discount code against server-authoritative cart lines.
 *
 * `cartLines` must contain DB-derived productId, categoryId, and lineTotal.
 * Never trust client-sent values for these fields.
 *
 * `shippingCost` defaults to 0. FREE_SHIPPING drives will yield
 * shippingDiscountAmount=shippingCost (TODO: wire actual shipping cost).
 */
export async function resolveDiscountForCart(params: {
  code: string;
  cartLines: ResolveCartLine[];
  shippingCost?: number;
}): Promise<ResolveDiscountResult> {
  const { cartLines, shippingCost = 0 } = params;
  const code = params.code.trim().toUpperCase();

  if (!code) return { valid: false, reason: 'NOT_FOUND' };

  // 1. Look up DiscountCode + DiscountDrive
  const discountCode = await prisma.discountCode.findUnique({
    where: { code },
    include: { drive: true },
  });

  if (!discountCode) return { valid: false, reason: 'NOT_FOUND' };

  const { drive } = discountCode;

  if (!drive.active) return { valid: false, reason: 'DRIVE_INACTIVE' };
  if (isCodeExhausted(discountCode))
    return { valid: false, reason: 'CODE_EXHAUSTED' };

  // 2. Resolve labels for UI hint (lightweight individual lookups)
  let categoryName: string | null = null;
  let productName: string | null = null;
  let variantSku: string | null = null;

  if (drive.scopeType === DiscountScope.CATEGORY && drive.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: drive.categoryId },
      select: { name: true },
    });
    categoryName = cat?.name ?? null;
  }
  if (drive.scopeType === DiscountScope.PRODUCT && drive.productId) {
    const product = await prisma.product.findUnique({
      where: { id: drive.productId },
      select: { name: true },
    });
    productName = product?.name ?? null;
  }
  if (drive.scopeType === DiscountScope.VARIANT && drive.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: drive.variantId },
      select: { sku: true },
    });
    variantSku = variant?.sku ?? null;
  }

  const hint = buildHint({
    scopeType: drive.scopeType,
    driveName: drive.name,
    categoryId: drive.categoryId,
    categoryName,
    productId: drive.productId,
    productName,
    variantId: drive.variantId,
    variantSku,
  });

  // 3. Filter eligible lines by scope
  const eligibleLines = cartLines.filter((line) => {
    switch (drive.scopeType) {
      case DiscountScope.GLOBAL:
        return true;
      case DiscountScope.CATEGORY:
        return line.categoryId === drive.categoryId;
      case DiscountScope.PRODUCT:
        return line.productId === drive.productId;
      case DiscountScope.VARIANT:
        return line.variantId === drive.variantId;
    }
  });

  if (eligibleLines.length === 0) {
    return {
      valid: false,
      reason: 'NOT_APPLICABLE_TO_CART',
      appliedToHint: hint,
    };
  }

  const eligibleSubtotal = eligibleLines.reduce(
    (sum, l) => sum + l.lineTotal,
    0,
  );

  // 4. Check min order value (on eligible subtotal only)
  if (drive.minOrderValue != null && eligibleSubtotal < drive.minOrderValue) {
    return {
      valid: false,
      reason: 'MIN_ORDER_NOT_MET',
      requiredMinOrder: drive.minOrderValue,
      eligibleSubtotal,
    };
  }

  // 5. Calculate discount
  let discountAmount = 0;
  let shippingDiscountAmount = 0;

  switch (drive.discountType) {
    case DiscountType.PERCENT:
      discountAmount = Math.round((eligibleSubtotal * drive.value) / 100);
      break;
    case DiscountType.AMOUNT:
      discountAmount = drive.value;
      break;
    case DiscountType.FREE_SHIPPING:
      // TODO: wire actual shipping cost when shipping is implemented
      shippingDiscountAmount = shippingCost;
      discountAmount = 0;
      break;
  }

  // Clamp
  discountAmount = Math.min(Math.max(0, discountAmount), eligibleSubtotal);
  shippingDiscountAmount = Math.min(
    Math.max(0, shippingDiscountAmount),
    shippingCost,
  );

  return {
    valid: true,
    code,
    driveId: drive.id,
    driveName: drive.name,
    discountAmount,
    shippingDiscountAmount,
    eligibleSubtotal,
    appliedToHint: hint,
  };
}

// ─── Validate endpoint helper ─────────────────────────────────────────────────

/**
 * Convert client-sent `[{ variantId, quantity }]` to server-authoritative
 * ResolveCartLine[] by looking up prices and category from the DB.
 *
 * Supports ProductVariant IDs only.
 */
export async function buildCartLinesFromVariantIds(
  input: Array<{ variantId: string; quantity: number }>,
): Promise<ResolveCartLine[]> {
  const ids = input.map((i) => i.variantId).filter(Boolean);
  if (!ids.length) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: ids }, active: true },
    include: {
      product: {
        select: {
          id: true,
          categoryId: true,
          priceInCents: true,
          published: true,
        },
      },
    },
  });
  const byVariantId = new Map(variants.map((v) => [v.id, v]));

  return input.flatMap((item) => {
    const qty = Math.max(1, Math.floor(item.quantity));

    const variant = byVariantId.get(item.variantId);
    if (!variant || !variant.product.published) return [];
    const unitPrice = variant.priceInCents ?? variant.product.priceInCents ?? 0;
    if (unitPrice <= 0) return [];
    return [
      {
        variantId: variant.id,
        productId: variant.product.id,
        categoryId: variant.product.categoryId,
        lineTotal: unitPrice * qty,
      },
    ];
  });
}

// ─── Idempotent usage marking (called from webhook on CAPTURED) ───────────────

/**
 * Mark usage for a DiscountCode after an order is CAPTURED.
 * Safe to call multiple times — idempotent by design.
 */
export async function markDiscountCodeUsed(
  orderId: string,
  code: string | null | undefined,
): Promise<void> {
  if (!code) return;

  const normalizedCode = code.trim().toUpperCase();
  const discountCode = await prisma.discountCode.findUnique({
    where: { code: normalizedCode },
  });

  if (!discountCode) {
    console.warn(
      `[Discounts] markDiscountCodeUsed: code "${normalizedCode}" not found`,
    );
    return;
  }

  switch (discountCode.usageType) {
    case DiscountUsageType.SINGLE_USE: {
      if (discountCode.usedAt !== null) {
        console.log(
          `[Discounts] SINGLE_USE ${normalizedCode} already marked (replay ok)`,
        );
        return;
      }
      await prisma.discountCode.update({
        where: { id: discountCode.id },
        data: { usedAt: new Date(), usedCount: { increment: 1 } },
      });
      console.log(
        `[Discounts] SINGLE_USE ${normalizedCode} used by order ${orderId}`,
      );
      break;
    }
    case DiscountUsageType.MAX_USES: {
      if (
        discountCode.maxUses !== null &&
        discountCode.usedCount >= discountCode.maxUses
      ) {
        console.log(
          `[Discounts] MAX_USES ${normalizedCode} already exhausted (replay ok)`,
        );
        return;
      }
      await prisma.discountCode.update({
        where: { id: discountCode.id },
        data: { usedCount: { increment: 1 } },
      });
      console.log(
        `[Discounts] MAX_USES ${normalizedCode} counted for order ${orderId}`,
      );
      break;
    }
    case DiscountUsageType.UNLIMITED: {
      await prisma.discountCode.update({
        where: { id: discountCode.id },
        data: { usedCount: { increment: 1 } },
      });
      console.log(
        `[Discounts] UNLIMITED ${normalizedCode} usage counted for order ${orderId}`,
      );
      break;
    }
  }
}
