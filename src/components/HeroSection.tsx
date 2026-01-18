// app/components/HeroSection.tsx
"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  onShopClick: () => void;
};


export function HeroSection({ onShopClick }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16 lg:py-24">
      <section className="hero">
        <div className="hero-content">
          <div className="kicker">New Edit</div>
          <h1 className="editorial-title">T-shirt, no cap — enkel elegans</h1>
          <p className="lead">Minimalistisk form, omsorgsfullt utförd.</p>
          <div className="mt-6">
            <Link href="/product" className="btn-primary">Utforska</Link>
          </div>
          <div id="info" className="mt-8 text-sm" style={{color:'var(--muted)'}}>
            ✓ Snabb leverans &nbsp; • &nbsp; ✓ Enkel retur &nbsp; • &nbsp; ✓ Premium feel
          </div>
        </div>

        <div className="hero-media order-first lg:order-none rounded-[20px] overflow-hidden">
          <div className="relative h-[clamp(320px,56vh,680px)]">
            <Image
              src="/boy.png"
              alt="Modell i vit t-shirt"
              width={520}
              height={680}
              priority
              className="object-contain object-bottom"
              sizes="(max-width: 640px) 92vw, 520px"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
