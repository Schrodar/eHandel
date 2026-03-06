/**
 * HTML email templates (Swedish).
 * Pure functions – no side effects, no Prisma, no Resend.
 */
import { siteConfig } from './siteConfig';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// ─── Order item row type ──────────────────────────────────────────────────────

export type EmailOrderItem = {
  productName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;   // öre (cents)
  lineTotal: number;   // öre (cents)
};

// ─── Order type ───────────────────────────────────────────────────────────────

export type EmailOrder = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  subtotal: number;  // öre
  shipping: number;  // öre
  discount: number;  // öre
  tax: number;       // öre
  total: number;     // öre
  currency: string;
  items: EmailOrderItem[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amountInCents: number, currency = 'SEK') {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amountInCents / 100);
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// ─── Template ────────────────────────────────────────────────────────────────

export function buildOrderConfirmationHtml(order: EmailOrder): string {
  const { company, links } = siteConfig;

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${item.productName}${item.variantName ? ` <span style="color:#666;font-size:13px;">(${item.variantName})</span>` : ''}
          </td>
          <td style="padding:8px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.unitPrice, order.currency)}</td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.lineTotal, order.currency)}</td>
        </tr>`,
    )
    .join('');

  const discountRow =
    order.discount > 0
      ? `<tr>
          <td colspan="3" style="padding:4px 0;text-align:right;color:#666;">Rabatt</td>
          <td style="padding:4px 0 4px 16px;text-align:right;color:#e00;">−${formatCurrency(order.discount, order.currency)}</td>
        </tr>`
      : '';

  const shippingRow =
    order.shipping > 0
      ? `<tr>
          <td colspan="3" style="padding:4px 0;text-align:right;color:#666;">Frakt</td>
          <td style="padding:4px 0 4px 16px;text-align:right;">${formatCurrency(order.shipping, order.currency)}</td>
        </tr>`
      : `<tr>
          <td colspan="3" style="padding:4px 0;text-align:right;color:#666;">Frakt</td>
          <td style="padding:4px 0 4px 16px;text-align:right;color:#27ae60;">Fri frakt</td>
        </tr>`;

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Orderbekräftelse ${order.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111;padding:32px 40px;">
              <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:1px;">${company.name}</h1>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 24px;border-bottom:1px solid #eee;">
              <h2 style="margin:0 0 8px;font-size:22px;">Tack för ditt köp! 🎉</h2>
              <p style="margin:0;color:#555;">
                Hej ${order.customerName}, vi har tagit emot din betalning och bekräftar härmed din order.
              </p>
            </td>
          </tr>

          <!-- Order meta -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #eee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#555;font-size:14px;">Ordernummer</td>
                  <td style="text-align:right;font-weight:bold;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:14px;padding-top:4px;">Datum</td>
                  <td style="text-align:right;padding-top:4px;">${formatDate(order.createdAt)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order items -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #eee;">
              <h3 style="margin:0 0 16px;font-size:16px;">Orderrader</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr style="font-size:13px;color:#999;">
                    <th style="text-align:left;padding-bottom:8px;">Produkt</th>
                    <th style="text-align:center;padding-bottom:8px;">Antal</th>
                    <th style="text-align:right;padding-bottom:8px;">À-pris</th>
                    <th style="text-align:right;padding-bottom:8px;padding-left:16px;">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
                <tfoot>
                  ${shippingRow}
                  ${discountRow}
                  <tr>
                    <td colspan="3" style="padding:12px 0 0;text-align:right;font-weight:bold;font-size:16px;border-top:2px solid #111;">Totalt (inkl. moms)</td>
                    <td style="padding:12px 0 0 16px;text-align:right;font-weight:bold;font-size:16px;border-top:2px solid #111;">${formatCurrency(order.total, order.currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- Ångerrätt -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #eee;background:#fafafa;">
              <h3 style="margin:0 0 8px;font-size:15px;">Ångerrätt</h3>
              <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
                Som privatkund har du 14 dagars ångerrätt från den dag du tar emot varan.<br/>
                Vill du returnera? Se instruktioner på vår
                <a href="${BASE_URL}${links.returns}" style="color:#111;">retursida</a>.<br/>
                Fullständiga köpvillkor hittar du <a href="${BASE_URL}${links.terms}" style="color:#111;">här</a>.
              </p>
            </td>
          </tr>

          <!-- Company footer -->
          <tr>
            <td style="padding:24px 40px;font-size:13px;color:#999;line-height:1.8;">
              <strong style="color:#555;">${company.name}</strong><br/>
              Org.nr: ${company.orgNumber}<br/>
              ${company.address}, ${company.zipCity}<br/>
              <a href="mailto:${company.email}" style="color:#555;">${company.email}</a> &nbsp;·&nbsp; ${company.phone}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOrderConfirmationText(order: EmailOrder): string {
  const { company, links } = siteConfig;
  const itemLines = order.items
    .map(
      (i) =>
        `  ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} × ${i.quantity} = ${formatCurrency(i.lineTotal, order.currency)}`,
    )
    .join('\n');

  return `Tack för ditt köp, ${order.customerName}!

Ordernummer: ${order.orderNumber}
Datum: ${formatDate(order.createdAt)}

ORDERRADER
${itemLines}
${order.shipping > 0 ? `  Frakt: ${formatCurrency(order.shipping, order.currency)}` : '  Frakt: Fri'}
${order.discount > 0 ? `  Rabatt: −${formatCurrency(order.discount, order.currency)}` : ''}
  TOTALT: ${formatCurrency(order.total, order.currency)}

ÅNGERRÄTT
Som privatkund har du 14 dagars ångerrätt.
Returinformation: ${BASE_URL}${links.returns}
Köpvillkor: ${BASE_URL}${links.terms}

---
${company.name} · Org.nr ${company.orgNumber}
${company.address}, ${company.zipCity}
${company.email} · ${company.phone}
`;
}

// ─── Shipping notification ────────────────────────────────────────────────────

export type EmailShippedOrder = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippedAt: Date;
  shippingCarrier?: string | null;
  shippingTracking?: string | null;
};

export function buildOrderShippedHtml(order: EmailShippedOrder): string {
  const { company } = siteConfig;

  const trackingBlock = order.shippingTracking
    ? `<tr>
          <td style="color:#555;font-size:14px;padding-top:4px;">Spårningsnummer</td>
          <td style="text-align:right;padding-top:4px;font-weight:bold;">${order.shippingTracking}</td>
        </tr>`
    : '';

  const carrierBlock = order.shippingCarrier
    ? `<tr>
          <td style="color:#555;font-size:14px;padding-top:4px;">Transportör</td>
          <td style="text-align:right;padding-top:4px;">${order.shippingCarrier}</td>
        </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Din order är på väg – ${order.orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#111;padding:32px 40px;">
              <h1 style="margin:0;color:#fff;font-size:24px;letter-spacing:1px;">${company.name}</h1>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 24px;border-bottom:1px solid #eee;">
              <h2 style="margin:0 0 8px;font-size:22px;">Din order är på väg! 📦</h2>
              <p style="margin:0;color:#555;">
                Hej ${order.customerName}, din order har nu lämnat lagret och är på väg till dig.
              </p>
            </td>
          </tr>

          <!-- Shipping meta -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #eee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#555;font-size:14px;">Ordernummer</td>
                  <td style="text-align:right;font-weight:bold;">${order.orderNumber}</td>
                </tr>
                <tr>
                  <td style="color:#555;font-size:14px;padding-top:4px;">Skickades</td>
                  <td style="text-align:right;padding-top:4px;">${formatDate(order.shippedAt)}</td>
                </tr>
                ${carrierBlock}
                ${trackingBlock}
              </table>
            </td>
          </tr>

          <!-- Company footer -->
          <tr>
            <td style="padding:24px 40px;font-size:13px;color:#999;line-height:1.8;">
              <strong style="color:#555;">${company.name}</strong><br/>
              Org.nr: ${company.orgNumber}<br/>
              ${company.address}, ${company.zipCity}<br/>
              <a href="mailto:${company.email}" style="color:#555;">${company.email}</a> &nbsp;·&nbsp; ${company.phone}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildOrderShippedText(order: EmailShippedOrder): string {
  const { company } = siteConfig;
  return `Din order är på väg, ${order.customerName}!

Ordernummer: ${order.orderNumber}
Skickades: ${formatDate(order.shippedAt)}
${order.shippingCarrier ? `Transportör: ${order.shippingCarrier}\n` : ''}${order.shippingTracking ? `Spårningsnummer: ${order.shippingTracking}\n` : ''}
---
${company.name} · Org.nr ${company.orgNumber}
${company.address}, ${company.zipCity}
${company.email} · ${company.phone}
`;
}
