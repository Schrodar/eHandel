import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { checkMFAStatus, requireAdminSession } from '@/lib/adminAuth';
import { cancelSetupAction, rotateTotpAction, startEnrollAction, verifyMfaAction } from './actions';
import { TotpQr } from '@/components/admin/TotpQr';

export const metadata = {
  title: 'Admin – MFA',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

type SetupCookie = {
  factorId: string;
  uri: string;
  secret: string;
};

function decodeCookie(raw: string): SetupCookie | null {
  // Backward-compatible: some older builds stored raw JSON with qrCodeSvg.
  try {
    const parsed = JSON.parse(raw) as unknown as { factorId?: string; uri?: string; secret?: string };
    if (parsed?.factorId && parsed?.uri && parsed?.secret) return parsed as SetupCookie;
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

export default async function AdminMfaPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  // Require session + allowlist, but allow AAL1 so user can enroll/verify.
  await requireAdminSession({ allowUnverifiedMfa: true });

  const resolvedSearchParams = (searchParams ? await searchParams : undefined) as
    | SearchParams
    | undefined;
  const error = toStringParam(resolvedSearchParams?.error);
  const setupCookie = await readSetupCookie();

  const status = await checkMFAStatus();
  const requireMfa = process.env.ADMIN_REQUIRE_MFA !== '0';
  const isAal2 = status.aal === 'aal2';

  if (!requireMfa) {
    redirect('/admin');
  }

  const hasTotp = status.hasTotp;
  const hasVerifiedTotp = status.hasVerifiedTotp;
  const hasUnverifiedTotp = status.hasUnverifiedTotp;
  const isInSetup = Boolean(setupCookie);

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg items-center px-4">
      <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-serif">Admin MFA</h1>
          <p className="text-sm text-slate-600">
            {isInSetup
              ? 'Skanna QR-koden och verifiera din kod för att fortsätta.'
              : hasTotp
                ? 'Verifiera din MFA-kod för att fortsätta till admin.'
                : 'Sätt upp MFA (TOTP) för att låsa upp admin.'}
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {error === 'invalid-code'
              ? 'Fel kod. Försök igen.'
              : error === 'no-factor'
                ? 'Ingen TOTP-faktor hittades. Starta setup igen.'
                : error === 'verify-existing'
                  ? 'Du har redan MFA aktiverat. Verifiera din kod först (du kan inte skapa en ny QR innan du verifierat).' 
                  : error === 'rotate-requires-aal2'
                    ? 'För att byta MFA-enhet måste du först verifiera din befintliga MFA-kod (AAL2).'
                  : error === 'aal2-required'
                    ? 'För att skapa en ny MFA-faktor krävs en verifierad session (AAL2). Verifiera din befintliga MFA-kod först.'
                : error === 'missing-code'
                  ? 'Ange en kod.'
                  : 'Något gick fel.'}
          </div>
        )}

        {!isInSetup && (!hasVerifiedTotp || hasUnverifiedTotp) && (
          <form action={startEnrollAction}>
            <button
              type="submit"
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {hasUnverifiedTotp ? 'Fortsätt/Starta om MFA-setup' : 'Starta MFA-setup'}
            </button>
          </form>
        )}

        {setupCookie && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                1) Skanna QR-koden i Authenticator-app
              </div>
              <div className="mt-3 flex justify-center rounded-lg bg-white p-3 ring-1 ring-slate-200">
                <TotpQr uri={setupCookie.uri} />
              </div>
              <div className="mt-3 text-xs text-slate-600 space-y-1">
                <p>Om du inte kan skanna: lägg in manuellt i appen.</p>
                <p>
                  <span className="font-semibold">Secret:</span>{' '}
                  <span className="font-mono break-all">{setupCookie.secret}</span>
                </p>
              </div>
            </div>

            <form action={verifyMfaAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  2) Ange 6-siffrig kod
                </label>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Verifiera
              </button>
            </form>

            <form action={cancelSetupAction}>
              <button
                type="submit"
                className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Avbryt setup
              </button>
            </form>
          </div>
        )}

        {!isInSetup && hasVerifiedTotp && (
          <div className="space-y-3">
            {isAal2 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                MFA är redan verifierad för denna session. Du kan fortsätta till admin, eller byta enhet och skapa en ny QR-kod.
              </div>
            )}

            <form action={verifyMfaAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                  Kod från Authenticator
                </label>
                <input
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Verifiera och fortsätt
              </button>
            </form>

            {isAal2 && (
              <form action={rotateTotpAction}>
                <button
                  type="submit"
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Byt enhet (ny QR-kod)
                </button>
              </form>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-slate-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Tillbaka till shoppen
          </Link>
          <form action="/admin/logout" method="post">
            <button type="submit" className="underline-offset-2 hover:underline">
              Logga ut
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
