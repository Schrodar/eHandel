"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/siteConfig';

type ContactLegalNavProps = {
  variant: 'desktop' | 'mobile';
};

const links = [
  { label: 'Kontakt', href: '/contact' },
  { label: 'Köpvillkor', href: siteConfig.links.terms },
  { label: 'Ångerrätt & Returer', href: siteConfig.links.returns },
  { label: 'Integritetspolicy', href: siteConfig.links.privacy },
];

export function ContactLegalNav({ variant }: ContactLegalNavProps) {
  const isDesktop = variant === 'desktop';
  const pathname = usePathname();

  const wrapperClasses = isDesktop
    ? 'hidden md:flex pointer-events-none md:pointer-events-auto items-center justify-end gap-6 text-sm uppercase tracking-[0.08em]'
    : 'flex md:hidden pointer-events-auto md:pointer-events-none flex-col gap-4 text-base text-white mt-8';

  const baseLinkClasses =
    'transition-colors underline-offset-8 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-900/50 rounded-sm';

  return (
    <nav aria-label="Legal navigation" className={wrapperClasses}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`${baseLinkClasses} ${pathname === link.href ? 'underline text-neutral-900' : 'text-neutral-900/70 hover:text-neutral-900'}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
