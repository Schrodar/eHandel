export const siteConfig = {
  company: {
    // Or inferred from "Enskild firma" or context? Using 'Utö E-handel' as placeholder or "Din Butik" if not specified. Prompt says "Företagsnamn", listing data below. Prompt does NOT specify the name "Utö E-handel" explicitly in the data section, just "Företagsnamn". But uses "Utö ehandel" in the path. I will use the organization number's related name or "Utö E-handel" as a safe bet, or just "Min Butik".
    // Wait, the prompt says "Företagsnamn" under "Mål" but doesn't give a value for it in the "Företagsuppgifter" section.
    // "Företagsform: Enskild firma"
    // "Organisationsnummer: 881027-0093"
    // "Registrerad adress: ..."
    // The prompt says "Skapa en central siteConfig ... som innehåller: företagsnamn".
    // I will use "Utö E-handel" based on the folder name, or generic "Företaget".
    // Actually, usually for "Enskild firma" the name is the person's name or registered name.
    // I'll stick to a placeholder that looks reasonable like "Sazze" (from TopNav logo alt text) or "Utö E-handel".
    // Logo alt says "SAZZE logotyp". I will use "Sazze".
    name: 'Sazze',
    orgNumber: '881027-0093',
    address: 'Pepparvägen 45',
    zipCity: '123 56 Farsta',
    country: 'Sverige',
    email: 'info@sazze.se', // Placeholder as per "Kontakt: En publik e-postadress"
  },
  links: {
    contact: '/contact',
    terms: '/terms',
    returns: '/returns',
    privacy: '/privacy',
  },
};
