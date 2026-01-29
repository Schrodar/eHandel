import { siteConfig } from '@/lib/siteConfig';

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Integritetspolicy</h1>

      <section className="space-y-6">
        <p>
          Vi värnar om din personliga integritet. Denna policy förklarar hur {siteConfig.company.name} samlar in och använder dina personuppgifter.
        </p>

        <div>
          <h2 className="text-xl font-semibold mb-2">Ansvarig för personuppgifter</h2>
          <p>
            {siteConfig.company.name} (Org.nr: {siteConfig.company.orgNumber}) är personuppgiftsansvarig för behandlingen av dina personuppgifter.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Vilka uppgifter samlar vi in?</h2>
          <p>
            Vi samlar in uppgifter som du lämnar till oss i samband med köp eller kontakt, såsom namn, adress, e-postadress, och telefonnummer.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Vad använder vi uppgifterna till?</h2>
          <ul className="list-disc pl-5 mt-1">
            <li>För att behandla och leverera din beställning.</li>
            <li>För att kommunicera med dig kring din order.</li>
            <li>För att fullgöra våra rättsliga förpliktelser (t.ex. bokföring).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Dina rättigheter</h2>
          <p>
            Du har rätt att begära ut vilka uppgifter vi har om dig, rätta felaktiga uppgifter eller begära att vi raderar dina uppgifter.
            Kontakta oss på <a href={`mailto:${siteConfig.company.email}`} className="text-blue-600 underline">{siteConfig.company.email}</a> vid frågor om dina personuppgifter.
          </p>
        </div>
      </section>
    </main>
  );
}
