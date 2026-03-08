import { ReactNode } from 'react';
import { ShopLegalNav } from '@/components/ShopLegalNav';

export default function ProductLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen pb-28 md:pb-0">
      {children}
      <ShopLegalNav />
    </div>
  );
}
