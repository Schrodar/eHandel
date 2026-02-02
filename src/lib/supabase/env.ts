export type SupabaseEnv = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing env ${name}. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Optionally set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) on server.`,
    );
  }
  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', url),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey),
    serviceRoleKey,
  };
}
