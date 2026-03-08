import { TriangleSpinner } from '@/components/TriangleSpinner';

/**
 * Shown by Next.js App Router while ProductPage is fetching data.
 * Matches the phone-frame card shape without duplicating any real UI.
 */
export default function ProductLoading() {
  return (
    <main className="min-h-dvh bg-[#f3f0ea] flex items-start justify-center py-8">
      <div
        style={{
          width: 'min(420px, 92vw)',
          borderRadius: 24,
          background: 'var(--bg, #f3f0ea)',
          boxShadow: '0 8px 40px rgba(12,15,20,0.10)',
        }}
      >
        {/* Image area skeleton */}
        <div
          style={{
            height: 'clamp(180px, 26vh, 320px)',
            borderRadius: '44px 44px 44px 44px',
            margin: '16px 16px 0',
            background: '#ede9e1',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        />

        {/* Content area: spinner centered */}
        <div
          className="flex items-center justify-center"
          style={{ minHeight: 260, paddingBottom: 32 }}
        >
          <TriangleSpinner />
        </div>
      </div>
    </main>
  );
}
