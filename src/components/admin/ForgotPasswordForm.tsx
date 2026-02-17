"use client";

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function ForgotPasswordForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus('loading');
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();

      // Build redirect dynamically from the browser origin per requirements.
      const redirectTo = `${window.location.origin}/admin/reset`;

      // Request password recovery email from Supabase.
      // supabase-js v2 supports resetPasswordForEmail.
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (sendError) {
        setError(sendError.message || 'Ett fel uppstod');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className={compact ? 'text-xs text-slate-600' : 'text-sm text-slate-600'}>
        E-post skickad om kontot finns. Kolla din inkorg.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-2' : 'space-y-4'}>
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600">
          E-post för återställning
        </label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
        >
          Skicka återställning
        </button>
        {status === 'loading' && <div className="text-xs text-slate-500">Skickar…</div>}
      </div>

      {error && <div className="text-xs text-rose-700">{error}</div>}
    </form>
  );
}
