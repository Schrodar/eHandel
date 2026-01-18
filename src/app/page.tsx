// app/page.tsx
"use client";

import { TopNav } from "../components/TopNav";
import { HeroSection } from "../components/HeroSection";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#f3f0ea] overflow-x-hidden">
      <TopNav />

      <HeroSection
        onShopClick={() =>
          document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
        }
      />

      {/* placeholder så länken #shop inte dör */}
      <div id="shop" className="hidden" />
    </div>
  );
}
