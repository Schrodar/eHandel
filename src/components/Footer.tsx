'use client';

import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';

export function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-100 py-12 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-4">{siteConfig.company.name}</h3>
          <p className="text-gray-600 text-sm mb-2">
            Org.nr: {siteConfig.company.orgNumber}
          </p>
          <p className="text-gray-600 text-sm mb-2">
            Registrerad adress: {siteConfig.company.address}, {siteConfig.company.zipCity}
          </p>
          <a
            href={`mailto:${siteConfig.company.email}`}
            className="text-gray-600 text-sm hover:underline"
          >
            {siteConfig.company.email}
          </a>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Link href={siteConfig.links.contact} className="text-gray-600 hover:text-black hover:underline">
            Kontakt
          </Link>
          <Link href={siteConfig.links.terms} className="text-gray-600 hover:text-black hover:underline">
            Köpvillkor
          </Link>
          <Link href={siteConfig.links.returns} className="text-gray-600 hover:text-black hover:underline">
            Ångerrätt & returer
          </Link>
          <Link href={siteConfig.links.privacy} className="text-gray-600 hover:text-black hover:underline">
            Integritetspolicy
          </Link>
        </div>
      </div>
    </footer>
  );
}
