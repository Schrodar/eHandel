// app/page.tsx
'use client';

import { TopNav } from '../components/TopNav';
import { HeroSection } from '../components/HeroSection';

export default function Page() {
  return (
    <div className="min-h-screen lg:h-screen bg-[#e9aeb7] overflow-x-hidden lg:overflow-hidden">
      <TopNav />

      <HeroSection />
    </div>
  );
}
