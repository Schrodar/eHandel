/**
 * adminText.ts
 *
 * All admin UI strings defined as plain TS constants.
 * Never goes through JSON / DB serialisation, so Swedish characters
 * stay as real Unicode — no \uXXXX escapes needed anywhere.
 */

export const adminText = {
  // ── Generic ─────────────────────────────────────────────────────────────────
  /** En dash – used as fallback for null/empty values in table cells */
  fallback: '–',
  /** Em dash — used as fallback for missing carrier / tracking */
  emDash: '—',

  // ── Error / toast ───────────────────────────────────────────────────────────
  genericError: 'Något gick fel',

  // ── Order status ────────────────────────────────────────────────────────────
  awaitingPayment:
    'Väntar på bekräftad betalning — logistikåtgärder låses upp när paymentStatus är CAPTURED.',
  shippedBadge: '✓ Skickad',

  // ── Shipping form — send ────────────────────────────────────────────────────
  carrierPlaceholder: 'PostNord, DHL…',
  trackingLabel: 'Spårningsnummer',
  trackingPlaceholder: 'Spårningsnummer',
  carrierTrackingRequired: 'Fraktbolag och spårningsnummer krävs för att skicka.',
  sendingLabel: 'Skickar…',
  sendOrderLabel: 'Skicka order',

  // ── Shipping form — update ───────────────────────────────────────────────────
  updateShippingHint:
    'Ändra fältvärdena nedan och klicka "Uppdatera frakt" för att korrigera.',
  noNewEmailSent: 'Inget nytt leveransmejl skickas.',
  newCarrierLabel: 'Nytt fraktbolag',
  newTrackingLabel: 'Nytt spårningsnummer',
  updateShippingLabel: 'Uppdatera frakt',
} as const;
