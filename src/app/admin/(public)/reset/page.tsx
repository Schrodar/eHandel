"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type FlowMode = 'pkce' | 'hash' | 'unknown';

export default function AdminResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<FlowMode>('unknown');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (code) {
      // PKCE flow – exchange the code for a session
      setMode('pkce');
      const supabase = createBrowserSupabaseClient();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Länken är ogiltig eller har gått ut. Begär en ny återställning.');
        }
        setReady(true);
      });
    } else {
      // Implicit flow – read token from hash (#access_token=...)
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      const params = new URLSearchParams(hash);
      const token = params.get('access_token');
      setAccessToken(token);
      setMode('hash');
      setReady(true);
    }
  }, []);

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
      if (mode === 'pkce') {
        // Session is already set after exchangeCodeForSession – update directly
        const supabase = createBrowserSupabaseClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) {
          setError('Kunde inte uppdatera lösenordet. Försök begära en ny länk.');
          setSending(false);
          return;
        }
        await supabase.auth.signOut();
        router.replace('/admin/login?reset=success');
        return;
      }

      // Implicit/hash flow – use server route with bearer token
      if (!accessToken) {
        setError('Ogiltig länk eller token saknas. Begär en ny återställning.');
        setSending(false);
        return;
      }

      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.error === 'invalid_or_expired_token') {
          setError('Länken är ogiltig eller har gått ut. Begär en ny återställning.');
        } else if (data?.error === 'password_too_short') {
          setError('Lösenordet är för kort. Minst 8 tecken krävs.');
        } else if (data?.error === 'too_many_requests') {
          setError('För många försök. Vänta en stund och försök igen.');
        } else {
          setError('Ett fel uppstod. Försök igen.');
        }
        setSending(false);
        return;
      }

      router.replace('/admin/login?reset=success');
    } catch {
      setError('Ett oväntat fel uppstod');
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
