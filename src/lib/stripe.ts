import 'server-only';
import Stripe from 'stripe';

function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return key;
}

export const stripe = new Stripe(getStripeSecretKey(), {
  apiVersion: '2026-02-25.clover',
});

console.log("Stripe key exists:", !!process.env.STRIPE_SECRET_KEY)