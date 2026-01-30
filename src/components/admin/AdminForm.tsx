'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

type ToastVariant = 'success' | 'error' | 'info';

type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  createdAt: number;
  ttlMs?: number;
};

const STORAGE_KEY = 'admin.toast';

function writeToastToSession(payload: ToastPayload) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function clearToastFromSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

function Spinner() {
  return (
    <div
      className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900"
      aria-hidden="true"
    />
  );
}

function PendingToast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 top-4 z-40">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg">
        <Spinner />
        <div className="font-medium">{message}</div>
      </div>
    </div>
  );
}

function PendingOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-white/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg">
        <Spinner />
        <div className="font-medium">{message}</div>
      </div>
    </div>
  );
}

function FormFeedback({
  toastMessage,
  toastVariant,
  pendingMessage,
  showOverlay,
}: {
  toastMessage?: string;
  toastVariant?: ToastVariant;
  pendingMessage: string;
  showOverlay: boolean;
}) {
  const { pending } = useFormStatus();
  const [showLocalToast, setShowLocalToast] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const wasPendingRef = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPendingRef.current = true;
      setShowLocalToast(false);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      return;
    }

    if (!pending && wasPendingRef.current) {
      wasPendingRef.current = false;
      clearToastFromSession();

      if (toastMessage) {
        setShowLocalToast(true);
        hideTimerRef.current = window.setTimeout(() => {
          setShowLocalToast(false);
        }, 2200);
      }
    }
  }, [pending, toastMessage]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  const toastClass =
    toastVariant === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : toastVariant === 'info'
        ? 'border-sky-200 bg-sky-50 text-sky-900'
        : 'border-emerald-200 bg-emerald-50 text-emerald-900';

  return (
    <>
      {pending && (showOverlay ? <PendingOverlay message={pendingMessage} /> : <PendingToast message={pendingMessage} />)}

      {showLocalToast && toastMessage && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${toastClass}`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}

export type AdminFormProps = Omit<
  React.ComponentPropsWithoutRef<'form'>,
  'action' | 'onSubmit'
> & {
  action: (formData: FormData) => void | Promise<void>;
  toastMessage?: string;
  toastVariant?: ToastVariant;
  pendingMessage?: string;
  showOverlay?: boolean;
};

export default function AdminForm({
  action,
  children,
  toastMessage = 'Sparat',
  toastVariant = 'success',
  pendingMessage = 'Sparar…',
  showOverlay = false,
  ...formProps
}: AdminFormProps) {
  return (
    <form
      {...formProps}
      action={action as unknown as React.ComponentPropsWithoutRef<'form'>['action']}
      onSubmit={() => {
        if (toastMessage) {
          writeToastToSession({
            message: toastMessage,
            variant: toastVariant,
            createdAt: Date.now(),
            ttlMs: 15_000,
          });
        }
      }}
    >
      {children}
      <FormFeedback
        toastMessage={toastMessage}
        toastVariant={toastVariant}
        pendingMessage={pendingMessage}
        showOverlay={showOverlay}
      />
    </form>
  );
}
