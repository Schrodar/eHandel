import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getSupabaseEnv } from './env';

type CookieToSet = {
  name: string;
  value: string;
  // Supabase SSR cookie options are compatible with Next's cookies API.
  // Keep this permissive to avoid coupling to Next's internal types.
  options: Record<string, unknown>;
};

export function createSupabaseMiddlewareClient(req: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookies.set(name, value, options);
        }
      },
    },
  });

  return { supabase, res };
}
