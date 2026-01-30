'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type ToastVariant = 'success' | 'error' | 'info';

type ToastPayload = {
  message: string;
  variant?: ToastVariant;
  createdAt: number;
  ttlMs?: number;
};

const STORAGE_KEY = 'admin.toast';
const DEFAULT_TTL_MS = 15_000;

function safeJsonParse(value: string | null): ToastPayload | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ToastPayload;
  } catch {
    return null;
  }
}

function readToastFromSession(): ToastPayload | null {
  if (typeof window === 'undefined') return null;
  return safeJsonParse(window.sessionStorage.getItem(STORAGE_KEY));
}

function clearToastFromSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export default function AdminToaster() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const show = (payload: ToastPayload) => {
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    setToast(payload);
    hideTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 2200);
  };

  useEffect(() => {
    const stored = readToastFromSession();
    if (!stored) return;

    const ttlMs = stored.ttlMs ?? DEFAULT_TTL_MS;
    const tooOld = Date.now() - stored.createdAt > ttlMs;

    clearToastFromSession();
    if (tooOld) return;

    show(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams?.toString()]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  if (!toast) return null;

  const variant: ToastVariant = toast.variant ?? 'success';

  const base =
    'fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur transition-all duration-200';
  const variantClass =
    variant === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : variant === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-900'
        : 'border-sky-200 bg-sky-50 text-sky-900';

  return (
    <div className={`${base} ${variantClass}`}> {toast.message} </div>
  );
}
