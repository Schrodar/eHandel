import { TriangleSpinner } from '@/components/TriangleSpinner';

/**
 * Shown by Next.js App Router while ProductPage fetches data.
 * Uses the same .phone-frame / .phone-scroll / .product-layout classes
 * as the real page — skeleton adapts automatically to every breakpoint.
 */
export default function ProductLoading() {
  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-start justify-center py-8">
      <div className="phone-frame">
        <div className="phone-scroll">
          <section className="w-full px-4 pt-4 pb-8 product-layout">

            {/* Image placeholder — left column on desktop, full width on mobile */}
            <div
              className="relative overflow-hidden rounded-[44px] border border-black/10"
              style={{ background: '#ede9e1', minHeight: 'clamp(180px, 26vh, 320px)' }}
            />

            {/* Info placeholder — right column on desktop */}
            <div className="flex flex-col gap-4 px-1 pt-2">
              <div style={{ height: 34, width: '60%', borderRadius: 8, background: 'rgba(0,0,0,0.07)' }} />
              <div style={{ height: 14, width: '40%', borderRadius: 6, background: 'rgba(0,0,0,0.05)' }} />
              <div className="flex flex-1 items-center justify-center" style={{ minHeight: 180 }}>
                <TriangleSpinner />
              </div>
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}
