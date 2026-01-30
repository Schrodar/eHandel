import { siteConfig } from '@/lib/siteConfig';
import { TopNav } from '@/components/TopNav';
import { Footer } from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#e9aeb7] overflow-x-hidden">
      <TopNav />

      <main className="mx-auto max-w-6xl px-4 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* VÄNSTER: rubrik + intro */}
          <div className="space-y-6">
            <h1 className="text-[32px] sm:text-[46px] leading-none font-extrabold tracking-tight text-white">
              Integritetspolicy
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg leading-relaxed max-w-[54ch]">
              Vi värnar om din personliga integritet. Här förklarar vi hur{' '}
              {siteConfig.company.name} samlar in, använder och skyddar dina
              personuppgifter.
            </p>

            <div className="text-sm text-white/80">
              ✓ Transparens • ✓ Säker hantering • ✓ Dina rättigheter
            </div>
          </div>

          {/* HÖGER: innehållskort */}
          <div className="rounded-[32px] bg-white/10 shadow-xl overflow-hidden border border-white/25">
            <div className="p-6 sm:p-8 space-y-8">
              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Ansvarig för personuppgifter
                </h2>
                <p className="text-white/85 leading-relaxed">
                  {siteConfig.company.name} (Org.nr: {siteConfig.company.orgNumber})
                  är personuppgiftsansvarig för behandlingen av dina personuppgifter.
                </p>
              </section>

              <div className="h-px bg-white/15" />

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Vilka uppgifter samlar vi in?
                </h2>
                <p className="text-white/85 leading-relaxed">
                  Vi samlar in uppgifter som du lämnar till oss i samband med köp
                  eller kontakt, såsom namn, adress, e-postadress och telefonnummer.
                </p>
              </section>

              <div className="h-px bg-white/15" />

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Vad använder vi uppgifterna till?
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-white/85">
                  <li>För att behandla och leverera din beställning.</li>
                  <li>För att kommunicera med dig kring din order.</li>
                  <li>För att fullgöra våra rättsliga förpliktelser (t.ex. bokföring).</li>
                </ul>
              </section>

              <div className="h-px bg-white/15" />

              <section>
                <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                  Dina rättigheter
                </h2>
                <p className="text-white/85 leading-relaxed">
                  Du har rätt att begära ut vilka uppgifter vi har om dig, rätta
                  felaktiga uppgifter eller begära att vi raderar dina uppgifter.
                  Kontakta oss på{' '}
                  <a
                    href={`mailto:${siteConfig.company.email}`}
                    className="underline underline-offset-4 hover:opacity-90"
                    style={{ color: 'var(--accent-2)' }}
                  >
                    {siteConfig.company.email}
                  </a>{' '}
                  vid frågor om dina personuppgifter.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

