// app/page.tsx
import type { Metadata } from 'next';
import { TopNav } from '../components/TopNav';
import { HeroSection } from '../components/HeroSection';
import { PrefetchShopOnIdle } from '@/components/PrefetchShopOnIdle';
import { Suspense } from 'react';
import { AdminLoginEntry } from '@/components/admin/AdminLoginEntry';

export const metadata: Metadata = {
  title: 'SAZZE — Essential Tees & Wardrobe',
  description:
    'Utforska SAZZE — minimalistiska essentials, premium t-shirts och curated wardrobe, server-renderad för snabb laddning och bästa SEO.',
};

export default function Page() {
  return (
    <div className="min-h-screen lg:h-screen bg-[#e9aeb7] overflow-x-hidden lg:overflow-hidden">
      <TopNav />

      <HeroSection />

      {/* Client island: prefetch /shop + preconnect to image hosts when idle */}
      <PrefetchShopOnIdle />

      {/* Client island: admin login button + modal */}
      <Suspense fallback={null}>
        <AdminLoginEntry />
      </Suspense>
    </div>
  );
}
