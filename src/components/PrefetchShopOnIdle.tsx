'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  /**
   * Comma-separated hosts (or full URLs) for preconnect/dns-prefetch.
   * Example: "https://xyz.supabase.co,https://cdn.sazze.se"
   */
  imageHostsCsv?: string;
  /** Session storage key to ensure this runs once per tab session. */
  sessionKey?: string;
};

function isDebugEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_PREFETCH_DEBUG;
  return v === '1' || v === 'true' || v === 'yes';
}

function normalizeToOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    // If user passes a bare host (cdn.example.com), assume https.
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

function ensureLink(rel: string, href: string, crossOrigin?: string) {
  if (typeof document === 'undefined') return;

  // Avoid querySelector with href interpolation (can break selector parsing).
  const existing = document.head.querySelectorAll<HTMLLinkElement>(
    `link[rel="${rel}"]`,
  );
  for (const link of existing) {
    if (link.getAttribute('href') === href) return;
  }

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.appendChild(link);
}

function requestIdle(cb: () => void) {
  if (typeof window === 'undefined') return;

  // Don’t block LCP — run only when browser is idle.
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
  };

  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout: 2000 });
    return;
  }

  window.setTimeout(cb, 1000);
}

export function PrefetchShopOnIdle({
  imageHostsCsv = process.env.NEXT_PUBLIC_IMAGE_PREFETCH_HOSTS || '',
  sessionKey = 'prefetch:idle:shop:v1',
}: Props) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem(sessionKey) === '1') return;
        sessionStorage.setItem(sessionKey, '1');
      }
    } catch {
      // sessionStorage might be blocked — still proceed.
    }

    const debug = isDebugEnabled();

    requestIdle(() => {
      try {
        router.prefetch('/shop');
        if (debug) console.log('[prefetch] router.prefetch(/shop)');
      } catch (e) {
        if (debug) console.log('[prefetch] router.prefetch failed', e);
      }

      const hosts = imageHostsCsv
        .split(',')
        .map((h) => normalizeToOrigin(h))
        .filter((h): h is string => Boolean(h));

      for (const origin of hosts) {
        // DNS + preconnect help later image loads without fetching assets now.
        ensureLink('dns-prefetch', origin);
        ensureLink('preconnect', origin, 'anonymous');
      }

      if (debug && hosts.length) {
        console.log('[prefetch] preconnect hosts', hosts);
      }
    });
  }, [router, imageHostsCsv, sessionKey]);

  return null;
}
