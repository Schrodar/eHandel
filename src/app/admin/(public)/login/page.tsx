import Link from 'next/link';

import { adminLoginAction } from './actions';

export const metadata = {
  title: 'Admin – Login',
};

export const dynamic = 'force-dynamic';

type SearchParams = { [key: string]: string | string[] | undefined };

function toStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const next = toStringParam(params?.next) ?? '/admin';
  const error = toStringParam(params?.error);
  const resetSuccess = toStringParam(params?.reset) === 'success';

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-serif">Admin login</h1>
          <p className="text-sm text-slate-600">
            Logga in för att administrera produkter och ordrar.
          </p>
        </header>

        {resetSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            Lösenord uppdaterat. Logga in med ditt nya lösenord.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {error === 'invalid'
              ? 'Fel e-post eller lösenord.'
              : 'Något gick fel.'}
          </div>
        )}

        <form action={adminLoginAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="source" value="admin-login-page" />

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
              E-post
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
              Lösenord
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Logga in
          </button>
        </form>
        <div className="mt-2 text-xs text-slate-500">
          <a href="/admin/reset" className="underline-offset-2 hover:underline">
            Glömt lösenord?
          </a>
        </div>

        <div className="text-xs text-slate-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            Tillbaka till shoppen
          </Link>
        </div>
      </div>
    </div>
  );
}
