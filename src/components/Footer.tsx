'use client';

import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { useEffect, useState } from 'react';

export function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full bg-[#e9aeb7] pt-16 pb-10 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        {/* Glass container */}
        <div className="rounded-[36px] bg-white/10 border border-white/25 shadow-xl px-6 py-10 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* VÄNSTER */}
            <div className="space-y-4">
              <div className="text-white font-extrabold text-xl tracking-tight">
                {siteConfig.company.name}
              </div>

              <p className="text-white/80 text-sm max-w-[42ch] leading-relaxed">
                Minimalistiska essentials. Premium t-shirts byggda för vardag,
                garderob och lång livslängd.
              </p>

              <div className="text-white/70 text-sm space-y-1">
                <p>Org.nr: {siteConfig.company.orgNumber}</p>
                <p>
                  {siteConfig.company.address},{' '}
                  {siteConfig.company.zipCity}
                </p>
                <a
                  href={`mailto:${siteConfig.company.email}`}
                  className="inline-block underline underline-offset-4 hover:opacity-90"
                  style={{ color: 'var(--accent-2)' }}
                >
                  {siteConfig.company.email}
                </a>
              </div>
            </div>

            {/* HÖGER */}
            <nav className="flex flex-col md:items-end gap-3 text-sm font-medium">
              <Link
                href={siteConfig.links.contact}
                className="text-white/85 hover:text-white underline-offset-4 hover:underline"
              >
                Kontakt
              </Link>
              <Link
                href={siteConfig.links.terms}
                className="text-white/85 hover:text-white underline-offset-4 hover:underline"
              >
                Köpvillkor
              </Link>
              <Link
                href={siteConfig.links.returns}
                className="text-white/85 hover:text-white underline-offset-4 hover:underline"
              >
                Ångerrätt & Returer
              </Link>
              <Link
                href={siteConfig.links.privacy}
                className="text-white/85 hover:text-white underline-offset-4 hover:underline"
              >
                Integritetspolicy
              </Link>
            </nav>
          </div>

          {/* Divider */}
          <div className="my-8 h-px bg-white/15" />

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
            <p>
              ©{' '}
              <span suppressHydrationWarning>{year ?? ''}</span>{' '}
              {siteConfig.company.name}. All rights reserved.
            </p>
            <p>Built in Sweden · Fast delivery · Premium feel</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
