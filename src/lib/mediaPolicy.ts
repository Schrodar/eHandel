/**
 * Central media activation policy.
 * Single source of truth for when a variant can be activated.
 *
 * Variant.active can be true ONLY if:
 * 1. At least 1 VariantImage exists
 * 2. Exactly 1 VariantImage with role='primary' exists
 * 3. Primary Asset.status === 'ready'
 * 4. Primary Asset.url is non-empty and valid http(s)
 */

type Asset = {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  status: string;
  type: string;
  updatedAt: Date;
};

type VariantImage = {
  variantId: string;
  assetId: string;
  role: string;
  sortOrder: number;
  asset: Asset;
  createdAt: Date;
};

export type VariantWithImages = {
  variantImages: (VariantImage & { asset: Asset })[];
  priceInCents?: number | null;
};

/**
 * Validates whether a variant can be activated.
 * Used in UI, server actions, API, and list/statistics.
 */
export function canActivateVariant(variant: VariantWithImages): {
  canActivate: boolean;
  reason?: string;
} {
  const { variantImages } = variant;

  // Must have at least 1 image
  if (!variantImages || variantImages.length === 0) {
    return { canActivate: false, reason: 'No images attached' };
  }

  // Must have exactly 1 primary
  const primaryImages = variantImages.filter((vi) => vi.role === 'primary');
  if (primaryImages.length === 0) {
    return { canActivate: false, reason: 'No primary image set' };
  }
  if (primaryImages.length > 1) {
    return {
      canActivate: false,
      reason: 'Multiple primary images (should be exactly 1)',
    };
  }

  const primaryImage = primaryImages[0];
  const primaryAsset = primaryImage.asset;

  // Primary Asset must be ready
  if (primaryAsset.status !== 'ready') {
    return {
      canActivate: false,
      reason: `Primary image status is "${primaryAsset.status}", must be "ready"`,
    };
  }

  // Primary Asset URL must be valid and non-empty
  if (!primaryAsset.url || primaryAsset.url.trim() === '') {
    return { canActivate: false, reason: 'Primary image URL is empty' };
  }

  // Basic URL validation (http/https)
  try {
    const url = new URL(primaryAsset.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        canActivate: false,
        reason: 'Primary image URL must be http(s)',
      };
    }
  } catch {
    return { canActivate: false, reason: 'Primary image URL is invalid' };
  }

  // Price must be set for an active variant
  if (variant.priceInCents == null) {
    return { canActivate: false, reason: 'Price is missing' };
  }

  return { canActivate: true };
}

/**
 * Get the primary image for a variant (or undefined if no valid primary).
 */
export function getPrimaryImage(variant: VariantWithImages): Asset | undefined {
  const primaryImage = variant.variantImages?.find(
    (vi) => vi.role === 'primary',
  );
  return primaryImage?.asset;
}

/**
 * Describe activation status for UI/statistics.
 */
export function getActivationStatus(
  variant: VariantWithImages & { active: boolean },
): {
  status: 'active' | 'inactive' | 'blocked';
  label: string;
  reason?: string;
} {
  if (variant.active) {
    return { status: 'active', label: 'Active' };
  }

  const { canActivate, reason } = canActivateVariant(variant);
  if (!canActivate) {
    return { status: 'blocked', label: 'Cannot activate', reason };
  }

  return { status: 'inactive', label: 'Inactive (can be activated)' };
}
