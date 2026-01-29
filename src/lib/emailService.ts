import { siteConfig } from './siteConfig';

// Mock email service
export async function sendOrderConfirmation(order: any) {
  const { customer, id, items, totalInclVat } = order;

  console.log(`[EmailService] Sending confirmation to ${customer.email}`);

  const emailBody = `
    Hej ${customer.firstName || 'Kund'},

    Tack för din beställning hos ${siteConfig.company.name}!

    Här är din orderbekräftelse:
    Ordernummer: ${id}
    Totalt belopp: ${totalInclVat} kr

    ---------------------------------------------------
    FÖRETAGSUPPGIFTER
    ${siteConfig.company.name}
    Org.nr: ${siteConfig.company.orgNumber}
    Adress: ${siteConfig.company.address}, ${siteConfig.company.zipCity}
    E-post: ${siteConfig.company.email}
    ---------------------------------------------------

    ÅNGERRÄTT
    Som privatkund har du 14 dagars ångerrätt från den dag du tar emot varan.
    Om du vill ångra ditt köp, se instruktioner på vår retursida:
    ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${siteConfig.links.returns}

    Du hittar våra fullständiga köpvillkor här:
    ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${siteConfig.links.terms}

    Vänliga hälsningar,
    ${siteConfig.company.name}
  `;

  // I verkligheten skulle vi använda t.ex. SendGrid eller Nodemailer här
  console.log('--- EMAIL CONTENT START ---');
  console.log(emailBody);
  console.log('--- EMAIL CONTENT END ---');
  
  return true;
}
