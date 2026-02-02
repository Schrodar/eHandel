'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { AdminLoginModal } from './AdminLoginModal';

export function AdminLoginEntry() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const adminLogin = searchParams.get('adminLogin');
  const error = searchParams.get('error');

  const shouldAutoOpen = adminLogin === '1' && pathname === '/';

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldAutoOpen) setOpen(true);
  }, [shouldAutoOpen]);

  const modalError = useMemo(() => {
    if (!open) return null;
    if (error === 'invalid') return 'invalid';
    return null;
  }, [open, error]);

  function close() {
    setOpen(false);

    // Clean up URL params if we came from a redirect back to home.
    if (pathname === '/' && (adminLogin || error)) {
      router.replace('/', { scroll: false });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-black/80 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-black"
        aria-label="Admin login"
      >
        Admin
      </button>

      <AdminLoginModal open={open} onClose={close} error={modalError} />
    </>
  );
}
