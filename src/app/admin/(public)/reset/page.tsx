"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function AdminResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);

  const tokens = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type = params.get('type');
    return { access_token, refresh_token, type };
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const supabase = createBrowserSupabaseClient();

        if (tokens?.access_token && tokens?.refresh_token) {
          // Set the session so we can call updateUser.
          // supabase-js v2 supports setSession.
          await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          });
        }

        setReady(true);
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setReady(true);
      }
    }

    init();
  }, [tokens]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Lösenord måste vara minst 8 tecken');
      return;
    }
    if (password !== confirm) {
      setError('Lösenorden matchar inte');
      return;
    }

    setSending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Kunde inte uppdatera lösenordet');
        setSending(false);
        return;
      }

      // Redirect to login with a success flag
      router.push('/admin/login?reset=success');
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h1 className="text-2xl font-serif">Återställ lösenord</h1>
          <p className="text-sm text-slate-600">Sätt ett nytt lösenord för ditt admin-konto.</p>
        </header>

        {!ready && <div className="text-sm text-slate-500">Förbereder…</div>}

        {ready && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Nytt lösenord
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
                Bekräfta lösenord
              </label>
              <input
                type="password"
                name="confirm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Spara nytt lösenord
              </button>
            </div>

            {error && <div className="text-sm text-rose-700">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
}
