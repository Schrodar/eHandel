'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PrefetchProduct = {
  slug: string;
  imageUrl: string | string[] | null;
};

type Props = {
  products: PrefetchProduct[];
  /** Guard so it runs once per tab session. */
  sessionKey?: string;
  /**
   * Optional opt-in: prefetch product details from an API.
   * Example: "/api/products/:slug" or "/api/product?slug=:slug"
   */
  detailsApiUrlTemplate?: string;
};

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

function isDebugEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_PREFETCH_DEBUG;
  return v === '1' || v === 'true' || v === 'yes';
}

function canPrefetchImages(): boolean {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as unknown as { connection?: NavigatorConnection })
    .connection;

  if (connection?.saveData) return false;
  const effectiveType = connection?.effectiveType;
  if (typeof effectiveType === 'string' && effectiveType.toLowerCase().includes('2g')) {
    return false;
  }

  return true;
}

function normalizeImageUrl(input: PrefetchProduct['imageUrl']): string | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] ?? null;
  const trimmed = String(input).trim();

  // Sometimes values can accidentally be serialized as a JSON array string.
  // Example: '["/product-w-002.svg"]'
  if (trimmed.startsWith('[') && trimmed.includes('"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        return parsed[0].trim();
      }
    } catch {
      // ignore
    }
  }

  return trimmed || null;
}

function ensureLink(rel: string, href: string, as?: string) {
  if (typeof document === 'undefined') return;

  // Avoid querySelector with user-provided href (can break CSS selector parsing).
  const existing = document.head.querySelectorAll<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  for (const link of existing) {
    if (link.getAttribute('href') === href) return;
  }

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (as) link.as = as;
  document.head.appendChild(link);
}

function toNextImageOptimizedUrl(rawUrl: string): string {
  // Warm Next/Image optimization cache when it’s used.
  // Works for both remote and local images (subject to Next config).
  const w = 640;
  const q = 75;
  return `/_next/image?url=${encodeURIComponent(rawUrl)}&w=${w}&q=${q}`;
}

export function ShopPrefetchTopProducts({
  products,
  sessionKey = 'prefetch:shop:top3:v1',
  detailsApiUrlTemplate,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem(sessionKey) === '1') return;
        sessionStorage.setItem(sessionKey, '1');
      }
    } catch {
      // ignore
    }

    const debug = isDebugEnabled();

    // Always safe: route-level prefetch.
    for (const p of products) {
      if (!p?.slug) continue;
      try {
        router.prefetch(`/product/${encodeURIComponent(p.slug)}`);
        if (debug) console.log('[prefetch] product route', p.slug);
      } catch (e) {
        if (debug) console.log('[prefetch] product route failed', p.slug, e);
      }
    }

    // Optional: API prefetch for product details.
    if (detailsApiUrlTemplate) {
      for (const p of products) {
        if (!p?.slug) continue;
        const url = detailsApiUrlTemplate.replace(':slug', encodeURIComponent(p.slug));
        fetch(url, { method: 'GET' }).catch(() => null);
        if (debug) console.log('[prefetch] product data', url);
      }
    }

    // Avoid image preloads on Save-Data / 2G.
    if (!canPrefetchImages()) {
      if (debug) console.log('[prefetch] skip image preloads (Save-Data/2G)');
      return;
    }

    for (const p of products) {
      const raw = normalizeImageUrl(p?.imageUrl);
      if (!raw) continue;

      // 1) Preload via <link> (best-effort).
      ensureLink('preload', raw, 'image');

      // 2) Warm image cache: try Next/Image URL and raw URL.
      try {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'eager';
        img.src = toNextImageOptimizedUrl(raw);

        const imgRaw = new Image();
        imgRaw.decoding = 'async';
        imgRaw.loading = 'eager';
        imgRaw.src = raw;

        if (debug) console.log('[prefetch] image', raw);
      } catch (e) {
        if (debug) console.log('[prefetch] image preload failed', raw, e);
      }
    }
  }, [router, products, sessionKey, detailsApiUrlTemplate]);

  return null;
}
