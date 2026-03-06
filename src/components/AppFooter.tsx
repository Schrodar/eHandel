'use client';

import { usePathname } from 'next/navigation';
import { Footer } from '@/components/Footer';

export function AppFooter() {
  const pathname = usePathname();

  if (
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/shop') ||
    pathname?.startsWith('/product')
  ) {
    return null;
  }

  return <Footer />;
}
