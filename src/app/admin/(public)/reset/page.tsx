"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);

  const accessToken = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const params = new URLSearchParams(hash);
    return params.get('access_token');
  }, []);

  useEffect(() => {
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accessToken) {
      setError('Ogiltig länk eller token saknas');
      return;
    }

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
        // Normalize server errors to user-friendly messages
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

      // Success
      router.replace('/admin/login?reset=success');
    } catch (err: any) {
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
