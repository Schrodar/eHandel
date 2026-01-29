import { siteConfig } from '@/lib/siteConfig';
import { Footer } from '@/components/Footer';

export default function ContactPage() {
  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-12 flex-grow w-full">
        <h1 className="text-3xl font-bold mb-8">Kontakta oss</h1>

        <p className="text-lg mb-8">
          Har du frågor om din order eller våra produkter? Tveka inte att höra av dig!
        </p>

        <div className="bg-gray-50 p-8 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Kontaktuppgifter</h2>
          <div className="space-y-2">
            <p>
              <strong>E-post:</strong>{' '}
              <a href={`mailto:${siteConfig.company.email}`} className="text-blue-600 underline text-lg">
                {siteConfig.company.email}
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              (Vi svarar normalt inom 24 timmar på vardagar)
            </p>
          </div>
        </div>

        <div className="border-t pt-8 mt-8">
          <h2 className="text-xl font-semibold mb-4">Företagsinformation</h2>
          <div className="text-gray-700">
            <p className="font-medium">{siteConfig.company.name}</p>
            <p>Org.nr: {siteConfig.company.orgNumber}</p>
            <p>Adress: {siteConfig.company.address}, {siteConfig.company.zipCity}, {siteConfig.company.country}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
