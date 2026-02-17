"use client";

import { useEffect, useRef, useState } from 'react';

import { adminLoginAction } from '@/app/admin/(public)/login/actions';
import { ForgotPasswordForm } from './ForgotPasswordForm';

type Props = {
  open: boolean;
  onClose: () => void;
  error?: 'invalid' | string | null;
};

export function AdminLoginModal({ open, onClose, error }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    if (open) {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close admin login"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Admin login</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200"
          >
            Stäng
          </button>
        </div>

        {error === 'invalid' && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Fel e-post eller lösenord.
          </div>
        )}

        {!showForgot && (
          <form action={adminLoginAction} className="mt-4 space-y-4">
          <input type="hidden" name="next" value="/admin" />
          <input type="hidden" name="source" value="home" />

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

          <p className="text-xs text-slate-500">
            Efter inloggning krävs tvåstegsverifiering (TOTP) för admin.
          </p>
        </form>
        )}

        {!showForgot && (
          <div className="mt-3 text-sm">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs text-slate-600 underline-offset-2 hover:underline"
            >
              Glömt lösenord?
            </button>
          </div>
        )}

        {showForgot && (
          <div className="mt-4">
            <ForgotPasswordForm compact />
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="text-xs text-slate-600 underline-offset-2 hover:underline"
              >
                Tillbaka till inloggning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
