// app/components/HeroSection.tsx
"use client";

import Image from "next/image";

type Props = {
  onShopClick: () => void;
};

export function HeroSection({ onShopClick }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16 lg:py-24 flex flex-col gap-16 lg:gap-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-14 w-full">
        {/* VÄNSTER */}
        <div className="h-full flex flex-col">
          <div className="space-y-6">
            <h1 className="text-[32px] sm:text-[46px] lg:text-[56px] leading-[1.0] font-extrabold tracking-tight text-white">
              T-shirt, no cap
              <br />
              jag är drip i basic format
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg leading-relaxed max-w-[52ch]">
              Minimalistisk, tun och mjuk. Black and Wihte.
              <br />
              Dop start kit.
            </p>

            {/* Du hade ingen knapp kvar här, men om du vill lägga tillbaka en "Handla nu" */}
            <button
              onClick={onShopClick}
              className="rounded-full bg-emerald-600 hover:bg-emerald-700 px-7 sm:px-8 py-3 font-semibold text-white transition"
            >
              Handla nu
            </button>
          </div>

          {/* INFO längst ner */}
          <div id="info" className="mt-auto pt-8 text-sm text-white/80">
            ✓ Snabb leverans &nbsp; • &nbsp; ✓ Enkel retur &nbsp; • &nbsp; ✓
            Premium feel
          </div>
        </div>

        {/* HÖGER */}
        {/* HÖGER / Bild */}
        <div className="order-first lg:order-none rounded-[44px] bg-white/10 shadow-xl overflow-hidden border border-white/25">
          <div className="relative h-[clamp(420px,68vh,820px)]">
            <Image
              src="/boy.png"
              alt="Modell i vit t-shirt"
              fill
              priority
              className="object-contain object-bottom"
              sizes="(max-width: 640px) 92vw, 520px"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
