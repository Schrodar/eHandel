'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { menuSerif } from '@/lib/fonts';
import { MobileScrollMenu } from '@/components/MobileScrollMenu';

const links = [
  { href: '/', label: 'Hem' },
  { href: '/contact', label: 'Information' },
];

export function ShopLegalNav() {
  const [open, setOpen] = useState(false);
  const navId = useId();
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKey);
      firstLinkRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="fixed top-5 right-4 z-50 md:hidden">
      <MobileScrollMenu onOpen={() => setOpen(true)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={navId}
          className={`${menuSerif.className} rounded-full bg-white/70 border border-white/40 backdrop-blur-md shadow-md px-6 py-2 text-sm uppercase tracking-[0.18em] text-neutral-800 hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-all duration-200`}
        >
          Meny
        </button>
      </MobileScrollMenu>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Stäng meny"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={close}
            />
            <motion.nav
              id={navId}
              aria-label="Navigering"
              className={`fixed top-0 right-0 z-50 h-full w-[82vw] max-w-xs bg-white/12 border-l border-white/25 backdrop-blur-2xl shadow-2xl px-6 py-8 flex flex-col gap-6 ${menuSerif.className}`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
            >
              <div className="flex items-center justify-between text-white">
                <p className="text-lg font-semibold tracking-wide">Navigering</p>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-full px-3 py-1"
                >
                  Stäng
                </button>
              </div>

              <div className="flex-1 space-y-4 text-lg text-white/85">
                {links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    className="block underline-offset-4 hover:underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-lg px-2 py-1"
                    onClick={close}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <p className="text-xs text-white/60 leading-relaxed">
                Snabb åtkomst till butik och juridisk information. Alltid uppdaterad,
                alltid transparent.
              </p>
              <div className="pb-[env(safe-area-inset-bottom)]" />
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
