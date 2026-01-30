import { siteConfig } from '@/lib/siteConfig';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#e9aeb7] overflow-x-hidden">
      <TopNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* VÄNSTER */}
          <div className="space-y-6">
            <h1 className="text-[32px] sm:text-[46px] leading-none font-extrabold tracking-tight text-white">
              Köpvillkor
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg leading-relaxed max-w-[54ch]">
              Här hittar du villkor för köp hos {siteConfig.company.name}, inklusive
              betalning, leverans och ångerrätt.
            </p>

            <div className="text-sm text-white/80">
              ✓ Tydliga villkor • ✓ Svensk e-handel • ✓ Enkelt att förstå
            </div>
          </div>

          {/* HÖGER */}
          <div className="rounded-[32px] bg-white/10 shadow-xl overflow-hidden border border-white/25">
            <div className="p-6 sm:p-8 space-y-8">
              {/* Företagsuppgifter (ersätter grå box) */}
              <section className="rounded-2xl bg-black/20 border border-white/15 p-5 sm:p-6">
                <h2 className="text-white font-semibold text-lg mb-3">
                  Företagsuppgifter
                </h2>

                <div className="text-white/85 leading-relaxed space-y-1">
                  <p className="font-semibold text-white">
                    {siteConfig.company.name}
                  </p>
                  <p>Org.nr: {siteConfig.company.orgNumber}</p>
                  <p>
                    {siteConfig.company.address}, {siteConfig.company.zipCity}
                  </p>
                  <p>
                    E-post:{' '}
                    <a
                      href={`mailto:${siteConfig.company.email}`}
                      className="underline underline-offset-4 hover:opacity-90"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      {siteConfig.company.email}
                    </a>
                  </p>
                  <p>Företagsform: Enskild firma</p>
                </div>
              </section>

              <div className="h-px bg-white/15" />

              <section className="space-y-6">
                <div>
                  <h2 className="text-white font-semibold text-lg mb-2">
                    1. Allmänt
                  </h2>
                  <p className="text-white/85 leading-relaxed">
                    Genom att lägga en beställning hos oss godkänner du dessa
                    köpvillkor. Beställning får endast göras av personer över 18 år.
                  </p>
                </div>

                <div>
                  <h2 className="text-white font-semibold text-lg mb-2">
                    2. Priser och betalning
                  </h2>
                  <p className="text-white/85 leading-relaxed">
                    Alla priser anges inklusive moms. Vi använder Klarna för betalning
                    – se Klarnas villkor i kassan.
                  </p>
                </div>

                <div>
                  <h2 className="text-white font-semibold text-lg mb-2">
                    3. Leverans
                  </h2>
                  <p className="text-white/85 leading-relaxed">
                    Normal leveranstid är 2–5 arbetsdagar. Vi skickar inom Sverige.
                  </p>
                </div>

                <div>
                  <h2 className="text-white font-semibold text-lg mb-2">
                    4. Ångerrätt
                  </h2>
                  <p className="text-white/85 leading-relaxed">
                    Se vår separata sida för{' '}
                    <a
                      href={siteConfig.links.returns}
                      className="underline underline-offset-4 hover:opacity-90"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      Ångerrätt & Returer
                    </a>
                    .
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
