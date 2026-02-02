'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  checkMFAStatus,
  enrollMFA,
  requireAdminSession,
  unenrollMFAFactor,
  verifyMFA,
} from '@/lib/adminAuth';

type SetupCookie = {
  factorId: string;
  uri: string;
  secret: string;
};

function encodeCookie(value: SetupCookie): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeCookie(raw: string): SetupCookie | null {
  // Backward-compatible: first try plain JSON, then base64url.
  try {
    const parsed = JSON.parse(raw) as SetupCookie;
    if (!parsed?.factorId || !parsed?.uri || !parsed?.secret) return null;
    return parsed;
  } catch {
    // continue
  }

  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as SetupCookie;
    if (!parsed?.factorId || !parsed?.uri || !parsed?.secret) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readSetupCookie(): Promise<SetupCookie | null> {
  const cookieStore = await Promise.resolve(cookies());
  const raw = cookieStore.get('admin_mfa_setup')?.value;
  if (!raw) return null;

  return decodeCookie(raw);
}

async function writeSetupCookie(value: SetupCookie) {
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set('admin_mfa_setup', encodeCookie(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 60 * 10,
  });
}

async function clearSetupCookie() {
  const cookieStore = await Promise.resolve(cookies());
  cookieStore.set('admin_mfa_setup', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: 0,
  });
}

export async function startEnrollAction() {
  await requireAdminSession({ allowUnverifiedMfa: true });

  const status = await checkMFAStatus();

  // If any VERIFIED factor exists, Supabase requires AAL2 to enroll additional factors.
  // In that case, user must verify first.
  if (status.hasAnyVerifiedFactor && status.aal !== 'aal2') {
    redirect('/admin/mfa?error=verify-existing');
  }

  try {
    // If the user is stuck with ONLY unverified factors (common when setup was started
    // but QR/secret was lost), try cleaning them up so we can enroll a fresh TOTP.
    if (status.hasAnyFactor && !status.hasAnyVerifiedFactor && status.aal !== 'aal2') {
      const factorIds = (status.allFactors ?? [])
        .map((f) => (f as any)?.id as string | undefined)
        .filter((id): id is string => Boolean(id));

      await Promise.all(
        factorIds.map(async (id) => {
          try {
            await unenrollMFAFactor({ factorId: id });
          } catch {
            // best-effort cleanup
          }
        }),
      );
    }

    const enrolled = await enrollMFA();
    await writeSetupCookie({
      factorId: enrolled.factorId,
      uri: enrolled.uri,
      secret: enrolled.secret,
    });
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? (err as any).code
        : typeof err === 'object' && err !== null && 'cause' in err && (err as any).cause
          ? (err as any).cause.code
          : undefined;
    if (code === 'insufficient_aal') {
      redirect('/admin/mfa?error=aal2-required');
    }
    throw err;
  }

  redirect('/admin/mfa');
}

export async function cancelSetupAction() {
  await requireAdminSession({ allowUnverifiedMfa: true });
  await clearSetupCookie();
  redirect('/admin/mfa');
}

export async function rotateTotpAction() {
  await requireAdminSession({ allowUnverifiedMfa: true });

  const status = await checkMFAStatus();
  if (status.aal !== 'aal2') {
    redirect('/admin/mfa?error=rotate-requires-aal2');
  }

  // Enroll a new factor first (allowed at AAL2). We keep old factors until the
  // new factor is verified, to avoid locking the admin out.
  const enrolled = await enrollMFA();
  await writeSetupCookie({
    factorId: enrolled.factorId,
    uri: enrolled.uri,
    secret: enrolled.secret,
  });

  redirect('/admin/mfa');
}

export async function verifyMfaAction(formData: FormData) {
  await requireAdminSession({ allowUnverifiedMfa: true });

  const code = ((formData.get('code') as string | null) || '').trim();
  if (!code) {
    redirect('/admin/mfa?error=missing-code');
  }

  const cookie = await readSetupCookie();
  const status = await checkMFAStatus();

  // Prefer ongoing setup cookie; otherwise use the first existing TOTP factor.
  const verifiedId = (status.totpFactors ?? []).find((f) => (f as any)?.status === 'verified')?.id;
  const factorId = cookie?.factorId ?? verifiedId ?? status.totpFactors[0]?.id;
  if (!factorId) {
    redirect('/admin/mfa?error=no-factor');
  }

  try {
    await verifyMFA({ factorId, code });
  } catch {
    redirect('/admin/mfa?error=invalid-code');
  }

  // If the user is verifying a newly enrolled factor (setup cookie exists),
  // rotate by removing older TOTP factors after successful verification.
  if (cookie?.factorId) {
    try {
      const after = await checkMFAStatus();
      const otherTotpIds = (after.totpFactors ?? [])
        .map((f) => f.id)
        .filter((id): id is string => Boolean(id) && id !== factorId);

      await Promise.all(
        otherTotpIds.map(async (id) => {
          try {
            await unenrollMFAFactor({ factorId: id });
          } catch {
            // best-effort cleanup
          }
        }),
      );
    } catch {
      // best-effort cleanup
    }
  }

  await clearSetupCookie();
  redirect('/admin');
}
