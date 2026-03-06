/**
 * Resend client singleton.
 *
 * Requires RESEND_API_KEY in env.
 * If the key is missing the module is still importable – callers receive null
 * and should fall back to console logging (dev mode).
 *
 * Dev email override
 * ──────────────────
 * Resend's onboarding@resend.dev sender (test domain) can only deliver to the
 * Resend account owner's verified email address.  In development we therefore
 * redirect ALL outgoing emails to DEV_EMAIL (when set) so you never accidentally
 * spam real customers.  This override is ONLY active when:
 *   • NODE_ENV === 'development'  AND
 *   • EMAIL_FROM contains 'resend.dev'  (test domain)
 *
 * Add to your .env:
 *   DEV_EMAIL=schrodar@gmail.com
 */
import { Resend } from 'resend';

function createResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn('[Resend] RESEND_API_KEY is not set – email sending is disabled. Set the key to enable real emails.');
    return null;
  }
  return new Resend(key);
}

// Export singleton; null means "no API key → dev/fallback mode"
export const resend = createResendClient();

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? 'onboarding@resend.dev';

/**
 * Returns the actual recipient address to use when sending an email.
 *
 * In development with a Resend test domain the real customer address is
 * replaced with DEV_EMAIL (if configured) so we don't hit the test-domain
 * restriction and don't spam real people.
 *
 * In production this function is a pass-through: it always returns `email`.
 */
export function resolveRecipient(email: string): { to: string; devOverride: boolean } {
  const isDev = process.env.NODE_ENV !== 'production';
  const isTestDomain = EMAIL_FROM.includes('resend.dev');
  const devEmail = process.env.DEV_EMAIL;

  if (isDev && isTestDomain && devEmail) {
    return { to: devEmail, devOverride: true };
  }
  return { to: email, devOverride: false };
}
