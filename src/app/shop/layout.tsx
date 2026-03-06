import { ReactNode } from 'react';
import { ShopLegalNav } from '@/components/ShopLegalNav';
import { CartPanel } from '@/components/cart/CartPanel';
import { DesktopCartLauncher } from '@/components/cart/DesktopCartLauncher';

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen pb-28 md:pb-0">
      {children}
      <ShopLegalNav />
      <CartPanel />
      <DesktopCartLauncher />
    </div>
  );
}
