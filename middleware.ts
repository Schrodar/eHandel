import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

function parseAdminEmails(raw: string | undefined): Set<string> {
  const values = (raw ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return new Set(values);
}

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allow = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (allow.size === 0) return false; // secure default
  return allow.has(email.toLowerCase());
}

function redirectTo(req: NextRequest, path: string) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect admin surfaces.
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApiPath = pathname.startsWith('/api/admin/');
  if (!isAdminPath && !isAdminApiPath) {
    return NextResponse.next();
  }

  const { supabase, res } = createSupabaseMiddlewareClient(req);

  // Ensure admin responses are never cached by intermediaries.
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.headers.set('Pragma', 'no-cache');
  res.headers.set('Expires', '0');

  // Public admin routes (still behind session for /admin/mfa).
  const isLogin = pathname === '/admin/login';
  const is403 = pathname === '/admin/403';
  const isMfa = pathname === '/admin/mfa';

  // Auth: use getUser() (not getSession()) for server-side validation.
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    // Not logged in.
    if (isLogin || is403) return res;
    if (isMfa) return redirectTo(req, '/admin/login');

    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in: allowlist check.
  if (!isAdminEmail(user.email)) {
    if (is403) return res;
    return redirectTo(req, '/admin/403');
  }

  // MFA (AAL2) required for admin (except the MFA page itself).
  const requireMfa = process.env.ADMIN_REQUIRE_MFA !== '0';
  if (requireMfa) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const aal = aalData?.currentLevel ?? 'aal1';
    if (aal !== 'aal2') {
      if (isMfa) return res;
      return redirectTo(req, '/admin/mfa');
    }
  }

  // If already fully authorized and they visit /admin/login, bounce to dashboard.
  if (isLogin) {
    return redirectTo(req, '/admin');
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
