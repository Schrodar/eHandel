import { siteConfig } from '@/lib/siteConfig';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#e9aeb7] overflow-x-hidden">
      <TopNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* VÄNSTER: rubrik + intro */}
          <div className="space-y-6">
            <h1 className="text-[32px] sm:text-[46px] leading-none font-extrabold tracking-tight text-white">
              Kontakta oss
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg leading-relaxed max-w-[54ch]">
              Har du frågor om din order eller våra produkter? Hör av dig så
              hjälper vi dig.
            </p>

            <div className="text-sm text-white/80">
              ✓ Vi svarar normalt inom 24 timmar på vardagar
            </div>
          </div>

          {/* HÖGER: kontaktkort */}
          <div className="rounded-[32px] bg-white/10 shadow-xl overflow-hidden border border-white/25">
            <div className="p-6 sm:p-8 space-y-8">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3">
                  Kontaktuppgifter
                </h2>

                <p className="text-white/85 leading-relaxed">
                  <span className="font-semibold text-white">E-post:</span>{' '}
                  <a
                    href={`mailto:${siteConfig.company.email}`}
                    className="underline underline-offset-4 hover:opacity-90"
                    style={{ color: 'var(--accent-2)' }}
                  >
                    {siteConfig.company.email}
                  </a>
                </p>
              </section>

              <div className="h-px bg-white/15" />

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-3">
                  Företagsinformation
                </h2>

                <div className="text-white/85 leading-relaxed space-y-1">
                  <p className="font-semibold text-white">
                    {siteConfig.company.name}
                  </p>
                  <p>Org.nr: {siteConfig.company.orgNumber}</p>
                  <p>
                    {siteConfig.company.address}, {siteConfig.company.zipCity},{' '}
                    {siteConfig.company.country}
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
