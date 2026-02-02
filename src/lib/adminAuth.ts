import 'server-only';

import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type RequireAdminSessionOptions = {
  allowUnverifiedMfa?: boolean;
  redirectTo?: string;
};

export type AdminSessionResult = {
  userId: string;
  email: string;
  aal: 'aal1' | 'aal2' | string;
  hasTotp: boolean;
};

function parseAdminEmails(raw: string | undefined): Set<string> {
  const values = (raw ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return new Set(values);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allow = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (allow.size === 0) return false; // secure default
  return allow.has(email.toLowerCase());
}

export async function checkMFAStatus() {
  const supabase = await createSupabaseServerClient();

  const [{ data: aalData, error: aalError }, { data: factorsData, error: factorsError }] =
    await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

  if (aalError) throw aalError;
  if (factorsError) throw factorsError;

  const allFactors = factorsData?.all ?? [];
  const totpFactors = factorsData?.totp ?? [];

  const verifiedTotpFactors = totpFactors.filter(
    (f) => (f as any)?.status === 'verified' || (f as any)?.status === 'verified_factor',
  );
  const unverifiedTotpFactors = totpFactors.filter((f) => (f as any)?.status === 'unverified');

  const hasVerifiedTotp = verifiedTotpFactors.length > 0;
  const hasUnverifiedTotp = unverifiedTotpFactors.length > 0;
  const hasAnyFactor = allFactors.length > 0;
  const hasAnyVerifiedFactor = allFactors.some(
    (f) => (f as any)?.status === 'verified' || (f as any)?.status === 'verified_factor',
  );
  const aal = aalData?.currentLevel ?? 'aal1';

  return {
    aal,
    hasTotp: totpFactors.length > 0,
    hasVerifiedTotp,
    hasUnverifiedTotp,
    hasAnyFactor,
    hasAnyVerifiedFactor,
    nextAal: aalData?.nextLevel ?? 'aal2',
    totpFactors,
    allFactors,
    verifiedTotpFactors,
    unverifiedTotpFactors,
  };
}

export async function enrollMFA() {
  const supabase = await createSupabaseServerClient();

  // Supabase requires unique friendly names per factor per user.
  // Use a unique name so retries don't fail with mfa_factor_name_conflict.
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `admin-${Date.now()}`,
  });
  if (error) throw error;

  if (!data?.id || !data?.totp?.secret || !data?.totp?.uri || !data?.totp?.qr_code) {
    throw new Error('Unexpected MFA enroll response from Supabase');
  }

  return {
    factorId: data.id,
    secret: data.totp.secret,
    uri: data.totp.uri,
    qrCodeSvg: data.totp.qr_code,
  };
}

export async function verifyMFA(params: { factorId: string; code: string }) {
  const supabase = await createSupabaseServerClient();

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: params.factorId,
  });
  if (challengeError) throw challengeError;

  const challengeId = challengeData?.id;
  if (!challengeId) {
    throw new Error('Unexpected MFA challenge response from Supabase');
  }

  const { data, error } = await supabase.auth.mfa.verify({
    factorId: params.factorId,
    challengeId,
    code: params.code,
  });
  if (error) throw error;

  return data;
}

export async function unenrollMFAFactor(params: { factorId: string }) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.mfa.unenroll({ factorId: params.factorId });
  if (error) throw error;
  return data;
}

export async function requireAdminSession(
  options: RequireAdminSessionOptions = {},
): Promise<AdminSessionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    redirect('/admin/login');
  }

  const user = userData.user;
  if (!user) {
    const next = options.redirectTo ? `?next=${encodeURIComponent(options.redirectTo)}` : '';
    redirect(`/admin/login${next}`);
  }

  const email = user.email ?? '';
  if (!isAdminEmail(email)) {
    redirect('/admin/403');
  }

  const { aal, hasTotp } = await checkMFAStatus();

  const requireMfa = process.env.ADMIN_REQUIRE_MFA !== '0';
  if (requireMfa && aal !== 'aal2' && !options.allowUnverifiedMfa) {
    redirect('/admin/mfa');
  }

  return {
    userId: user.id,
    email,
    aal,
    hasTotp,
  };
}
