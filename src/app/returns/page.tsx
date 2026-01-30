import { siteConfig } from '@/lib/siteConfig';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export default function ReturnsPage() {
  return (
    <div className="min-h-screen bg-[#e9aeb7] overflow-x-hidden">
      <TopNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* VÄNSTER: rubrik + intro */}
          <div className="space-y-6">
            <h1 className="text-[32px] sm:text-[46px] leading-none font-extrabold tracking-tight text-white">
              14 dagars ångerrätt
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg leading-relaxed max-w-[54ch]">
              Du har alltid 14 dagar på dig att ångra ditt köp från att du mottagit
              varan. Nedan hittar du en tydlig sammanfattning och hur du går tillväga.
            </p>

            <div className="text-sm text-white/80">
              ✓ Tydligt • ✓ Enkelt • ✓ Inga konstigheter
            </div>
          </div>

          {/* HÖGER: sammanfattning + detaljer */}
          <div className="rounded-[32px] bg-white/10 shadow-xl overflow-hidden border border-white/25">
            <div className="p-6 sm:p-8 space-y-8">
              {/* Sammanfattning (ersätter blå boxen) */}
              <section className="rounded-2xl bg-black/20 border border-white/15 p-5 sm:p-6">
                <h2 className="text-white font-semibold text-lg mb-3">
                  Sammanfattning
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-white/85">
                  <li>14 dagars ångerrätt från att du mottagit varan.</li>
                  <li>Du står själv för returfrakten.</li>
                  <li>Varan ska vara i väsentligt oförändrat skick.</li>
                  <li>
                    Kontakta oss på{' '}
                    <a
                      href={`mailto:${siteConfig.company.email}`}
                      className="underline underline-offset-4 hover:opacity-90"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      {siteConfig.company.email}
                    </a>{' '}
                    för att starta en retur.
                  </li>
                </ul>
              </section>

              <div className="h-px bg-white/15" />

              <section className="space-y-6">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    1. Ångerrätt
                  </h3>
                  <p className="text-white/85 leading-relaxed">
                    Enligt lag har du som konsument 14 dagars ångerrätt från det att
                    du eller ditt ombud har tagit emot varan. För att utnyttja din
                    ångerrätt måste du meddela oss detta inom 14 dagar.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    2. Så här ångrar du ditt köp
                  </h3>
                  <p className="text-white/85 leading-relaxed">
                    Skicka ett tydligt meddelande till oss, enklast via e-post till{' '}
                    <a
                      href={`mailto:${siteConfig.company.email}`}
                      className="underline underline-offset-4 hover:opacity-90"
                      style={{ color: 'var(--accent-2)' }}
                    >
                      {siteConfig.company.email}
                    </a>
                    .
                  </p>

                  <p className="text-white/85 mt-3">Ange gärna:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-2 text-white/85">
                    <li>Ditt namn och kontaktuppgifter</li>
                    <li>Ordernummer</li>
                    <li>Vilka varor du vill returnera</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    3. Varans skick
                  </h3>
                  <p className="text-white/85 leading-relaxed">
                    Varan ska returneras i väsentligt oförändrat skick. Du har rätt
                    att öppna förpackningen och undersöka varan, men om den hanterats
                    mer än vad som varit nödvändigt för att fastställa dess egenskaper
                    och funktion kan ett värdeminskningsavdrag göras på återbetalningen.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    4. Returfrakt
                  </h3>
                  <p className="text-white/85 leading-relaxed">
                    Du som kund står för kostnaden av returfrakten. Varan ska skickas
                    väl emballerad.
                  </p>
                </div>

                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    5. Återbetalning
                  </h3>
                  <p className="text-white/85 leading-relaxed">
                    Vi återbetalar beloppet så snart som möjligt, dock senast inom 14
                    dagar från att vi mottagit ditt meddelande om ånger – förutsatt att
                    vi har mottagit returen eller bevis på att den skickats.
                    Återbetalning sker via samma betalsätt som du använde vid köpet.
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
