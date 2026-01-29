import { siteConfig } from '@/lib/siteConfig';

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Köpvillkor</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Företagsuppgifter</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <p className="font-bold">{siteConfig.company.name}</p>
          <p>Org.nr: {siteConfig.company.orgNumber}</p>
          <p>Adress: {siteConfig.company.address}, {siteConfig.company.zipCity}</p>
          <p>E-post: <a href={`mailto:${siteConfig.company.email}`} className="text-blue-600 underline">{siteConfig.company.email}</a></p>
          <p>Företagsform: Enskild firma</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">1. Allmänt</h2>
        <p>
          Genom att lägga en beställning hos oss godkänner du dessa köpvillkor.
          Beställning får endast göras av personer över 18 år.
        </p>

        <h2 className="text-xl font-semibold">2. Priser och betalning</h2>
        <p>
          Alla priser anges inklusive moms. Vi använder oss av Klarna för betalning,
          se Klarnas villkor i kassan.
        </p>

        <h2 className="text-xl font-semibold">3. Leverans</h2>
        <p>
          Normal leveranstid är 2-5 arbetsdagar. Vi skickar inom Sverige.
        </p>
        
        <h2 className="text-xl font-semibold">4. Ångerrätt</h2>
        <p>
          Se vår separata sida för <a href={siteConfig.links.returns} className="text-blue-600 underline">Ångerrätt & Returer</a>.
        </p>
      </section>
    </main>
  );
}
