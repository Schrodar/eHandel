import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSupabaseEnv } from './env';

type CookieToSet = {
  name: string;
  value: string;
  // Supabase SSR cookie options are compatible with Next's cookies API.
  // Keep this permissive to avoid coupling to Next's internal types.
  options: Record<string, unknown>;
};

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();

  // In newer Next runtimes, cookies() can be async.
  const cookieStore = await Promise.resolve(cookies());

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        // Server Components may not be allowed to set cookies; server actions/route handlers are.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // ignore
        }
      },
    },
  });
}
