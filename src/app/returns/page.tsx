import { siteConfig } from '@/lib/siteConfig';

export default function ReturnsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">14 dagars ångerrätt</h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
        <h2 className="font-bold mb-2">Sammanfattning (TL;DR)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Du har alltid 14 dagars ångerrätt från att du mottagit varan.</li>
          <li>Du står själv för returfrakten.</li>
          <li>Varan ska vara i väsentligt oförändrat skick.</li>
          <li>Kontakta oss på {siteConfig.company.email} för att starta en retur.</li>
        </ul>
      </div>

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Ångerrätt</h2>
          <p>
            Enligt lag har du som konsument alltid 14 dagars ångerrätt från det att du eller ditt ombud har tagit emot varan.
            För att utnyttja din ångerrätt måste du meddela oss detta inom 14 dagar.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Så här ångrar du ditt köp</h2>
          <p>
            För att utöva din ångerrätt ska du skicka ett tydligt meddelande till oss, enklast via e-post till{' '}
            <a href={`mailto:${siteConfig.company.email}`} className="text-blue-600 underline">
              {siteConfig.company.email}
            </a>.
          </p>
          <p className="mt-2">Ange:</p>
          <ul className="list-disc pl-5 mt-1">
            <li>Ditt namn och kontaktuppgifter</li>
            <li>Ordernummer</li>
            <li>Vilka varor du vill returnera</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Varans skick</h2>
          <p>
            Varan ska returneras i väsentligt oförändrat skick. Du har rätt att öppna förpackningen och undersöka varan,
            men om den hanterats mer än vad som varit nödvändigt för att fastställa dess egenskaper och funktion,
            förbehåller vi oss rätten att göra ett värdeminskningsavdrag på återbetalningen.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Returfrakt</h2>
          <p>
            Du som kund står för kostnaden av returfrakten. Varan ska skickas väl emballerad.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Återbetalning</h2>
          <p>
            Vi betalar tillbaka beloppet så fort som möjligt, dock senast inom 14 dagar från det att vi mottagit ditt meddelande om ånger,
            förutsatt att vi har mottagit returen eller bevis på att den skickats. Återbetalning sker via samma betalsätt som du använde vid köpet.
          </p>
        </div>
      </section>
    </main>
  );
}
