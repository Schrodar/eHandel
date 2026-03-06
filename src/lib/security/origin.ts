import 'server-only';
import { NextRequest, NextResponse } from 'next/server';

/**
 * assertSameOrigin
 *
 * Defence-in-depth CSRF guard for mutating admin API endpoints (POST/PUT/PATCH/DELETE).
 *
 * Checks that the request `Origin` (or `Referer` as fallback) matches the
 * application host. If they don't match or both are missing, returns a 403.
 *
 * This is layered on top of Supabase session cookies (requireAdminSession)
 * and Next.js CSRF protection from middleware; it is NOT a replacement.
 *
 * Usage in a route handler:
 *   const reject = assertSameOrigin(req);
 *   if (reject) return reject;
 *   // … continue processing
 */
export function assertSameOrigin(req: NextRequest): NextResponse | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const expectedHost = siteUrl ? new URL(siteUrl).host : null;

  // Derive the actual host from the request (works on Vercel / Netlify / localhost)
  const requestHost =
    req.headers.get('x-forwarded-host') || req.headers.get('host') || '';

  // Prefer the Origin header (set by all modern browsers on cross-origin fetches)
  const originHeader = req.headers.get('origin');
  if (originHeader) {
    try {
      const originHost = new URL(originHeader).host;
      if (
        originHost === requestHost ||
        (expectedHost && originHost === expectedHost)
      ) {
        return null; // ✓ same origin
      }
    } catch {
      // malformed Origin header – fall through to Referer check
    }
  }

  // Fallback: Referer (older browsers, some server-to-server clients)
  const refererHeader = req.headers.get('referer');
  if (refererHeader) {
    try {
      const refererHost = new URL(refererHeader).host;
      if (
        refererHost === requestHost ||
        (expectedHost && refererHost === expectedHost)
      ) {
        return null; // ✓ same origin via Referer
      }
    } catch {
      // malformed Referer – fall through
    }
  }

  // During local development allow omitted origin (curl, Postman, REST clients)
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  console.warn(
    `[Security] CSRF: rejected request to ${req.nextUrl.pathname}` +
    ` — Origin=${originHeader ?? 'none'} Referer=${refererHeader ?? 'none'}` +
    ` expectedHost=${expectedHost ?? requestHost}`,
  );

  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 },
  );
}
