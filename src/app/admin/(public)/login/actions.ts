'use server';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkMFAStatus, isAdminEmail } from '@/lib/adminAuth';

function safeTrim(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function isValidNextPath(nextPath: string): boolean {
  return nextPath.startsWith('/admin');
}

function redirectInvalid(source: string | null): never {
  if (source === 'home') {
    redirect('/?adminLogin=1&error=invalid');
  }
  redirect('/admin/login?error=invalid');
}

export async function adminLoginAction(formData: FormData) {
  const email = safeTrim(formData.get('email'));
  const password = safeTrim(formData.get('password'));
  const nextPathRaw = safeTrim(formData.get('next')) || '/admin';
  const source = safeTrim(formData.get('source')) || null;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  const user = data.user;

  if (error || !user) {
    redirectInvalid(source);
  }

  // Tight: if the user is not allowlisted, terminate the session immediately.
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    redirect('/admin/403');
  }

  const requireMfa = process.env.ADMIN_REQUIRE_MFA !== '0';
  if (requireMfa) {
    const status = await checkMFAStatus();
    if (status.aal !== 'aal2') {
      redirect('/admin/mfa');
    }
  }

  redirect(isValidNextPath(nextPathRaw) ? nextPathRaw : '/admin');
}
