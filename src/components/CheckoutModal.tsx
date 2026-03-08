// app/components/CheckoutModal.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomerInfo } from './checkout';
import { validateCheckoutRequest, createCheckoutRequest } from './checkout';
import { useCartContext } from '@/context/CartProvider';
import { formatPrice } from './products';
import type { CartItem } from '@/hooks/useCart';
import { checkoutPaymentMethods } from '@/lib/payments/providers';
import { PAYMENT_PROVIDERS, type PaymentProviderCode } from '@/lib/payments/types';
import { MobileCouponBox } from '@/components/cart/MobileCouponBox';
import { CouponInput } from '@/components/cart/CouponInput';

// Dynamically imported so Stripe JS is never bundled into the main chunk —
// it only loads once the user opens the checkout form.
const StripeCardPayment = dynamic(
  () => import('./StripeCardPayment').then((m) => ({ default: m.StripeCardPayment })),
  { ssr: false },
);

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CheckoutModal({ open, onClose }: Props) {
  const { cart, items, reset: clearCart, coupon, applyCoupon, removeCoupon } = useCartContext();
  const [formData, setFormData] = useState<Partial<CustomerInfo>>({
    country: 'SE', // Låst till Sverige
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderCode>(
    PAYMENT_PROVIDERS.STRIPE,
  );
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderPublicToken, setOrderPublicToken] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const checkoutRef = useRef<HTMLDivElement | null>(null);

  // Scroll to payment section once it is mounted in the DOM
  useEffect(() => {
    if (showPaymentForm) {
      // Double rAF: first frame = React commits DOM, second frame = browser has painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          checkoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }
  }, [showPaymentForm]);

  if (!open) return null;

  // Beräkna totalsumma lokalt från cart items (öre)
  type LineItemSummary = {
    product: CartItem;
    quantity: number;
    lineTotal: number;
    lineVat: number;
  };

  const orderTotal = items.reduce(
    (
      acc: {
        totalInclVatOre: number;
        totalExVatOre: number;
        totalVatOre: number;
        lineItems: LineItemSummary[];
      },
      it,
    ) => {
      const unit = it.unitPrice;
      const qty = it.quantity;
      const lineTotal = unit * qty;
      const divisor = 10000 + (it.taxRate ?? 2500);
      const lineExVat = Math.round((lineTotal * 10000) / divisor);
      const lineVat = lineTotal - lineExVat;
      acc.totalInclVatOre += lineTotal;
      acc.totalExVatOre += lineExVat;
      acc.totalVatOre += lineVat;
      acc.lineItems.push({ product: it, quantity: qty, lineTotal, lineVat });
      return acc;
    },
    { totalInclVatOre: 0, totalExVatOre: 0, totalVatOre: 0, lineItems: [] },
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Skapa customer object
    const customer: CustomerInfo = {
      email: formData.email || '',
      phone: formData.phone || '',
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      streetAddress: formData.streetAddress || '',
      postalCode: formData.postalCode || '',
      city: formData.city || '',
      country: 'SE',
    };

    // Skapa checkout request
    const checkoutRequest = createCheckoutRequest(cart, customer);
    if (coupon?.code) {
      checkoutRequest.discountCode = coupon.code;
    }

    // Validera
    const validation = validateCheckoutRequest(checkoutRequest);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Rensa errors och fortsätt
    setErrors([]);
    setCheckoutError(null);

    try {
      setSubmitting(true);

      // For Stripe: use embedded payment (create order, then show payment form)
      if (selectedProvider === PAYMENT_PROVIDERS.STRIPE) {
        const response = await fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(checkoutRequest),
        });

        const data = (await response.json()) as { orderId?: string; publicToken?: string; error?: string };

        if (!response.ok || !data.orderId) {
          throw new Error(data.error || 'Kunde inte skapa order.');
        }

        setOrderId(data.orderId);
        setOrderPublicToken(data.publicToken ?? null);
        setPaymentError(null);
        setShowPaymentForm(true);
        setSubmitting(false);
        return;
      }

      // For Klarna: use existing redirect flow
      const endpoint = '/api/checkout/klarna';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutRequest),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Kunde inte starta betalningen.');
      }

      window.location.assign(data.url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Något gick fel vid checkout.';
      setCheckoutError(message);
      setSubmitting(false);
    }
  }

  function updateField(field: keyof CustomerInfo, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Kassan</h3>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200"
          >
            Stäng
          </button>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <p className="text-sm font-semibold text-slate-700">Din order</p>
          <div className="mt-2 space-y-1">
            {items.map((item) => (
              <div key={item.sku} className="flex justify-between text-sm">
                <span className="text-slate-600">
                  {item.productName} × {item.quantity}
                </span>
                <span className="text-slate-900 font-medium">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-300 space-y-1">
            {/* Discount row */}
            {coupon && (() => {
              const saving = coupon.discountAmount + coupon.shippingDiscountAmount;
              return (
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Rabatt ({coupon.code})</span>
                  <span className="font-semibold">−{formatPrice(saving)}</span>
                </div>
              );
            })()}
            {/* Total row */}
            <div className="flex justify-between pt-1">
              <span className="font-semibold text-slate-900">
                Totalt (inkl. moms)
              </span>
              <span className="font-bold text-slate-900">
                {coupon
                  ? formatPrice(Math.max(0, orderTotal.totalInclVatOre - coupon.discountAmount - coupon.shippingDiscountAmount))
                  : formatPrice(orderTotal.totalInclVatOre)}
              </span>
            </div>
          </div>

          {/* Coupon — mobile accordion */}
          <div className="mt-3 pt-3 border-t border-slate-200 md:hidden">
            <MobileCouponBox
              items={items}
              appliedDiscount={coupon}
              onApply={applyCoupon}
              onRemove={removeCoupon}
            />
          </div>

          {/* Coupon — desktop inline */}
          <div className="mt-3 pt-3 border-t border-slate-200 hidden md:block">
            <p className="text-xs text-slate-500 mb-1.5">Har du en rabattkod?</p>
            <CouponInput
              items={items}
              appliedDiscount={coupon}
              onApply={applyCoupon}
              onRemove={removeCoupon}
            />
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-sm font-semibold text-red-900">Fel:</p>
            <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {checkoutError && (
          <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-sm font-semibold text-red-900">Checkout-fel:</p>
            <p className="mt-1 text-sm text-red-700">{checkoutError}</p>
          </div>
        )}

        <fieldset className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <legend className="text-sm font-semibold text-slate-700 px-1">
            Välj betalningsmetod
          </legend>

          <div className="mt-2 space-y-2">
            {checkoutPaymentMethods.map((method) => {
              const disabled = !method.enabled || submitting;
              const active = selectedProvider === method.code;

              return (
                <label
                  key={method.code}
                  className={[
                    'flex items-start gap-3 rounded-xl border p-3 transition',
                    active ? 'border-slate-700 bg-white' : 'border-slate-200 bg-white/80',
                    disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="payment-provider"
                    value={method.code}
                    checked={active}
                    disabled={disabled}
                    onChange={() => setSelectedProvider(method.code)}
                    className="mt-1"
                  />

                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">
                      {method.label}
                    </span>
                    <span className="text-xs text-slate-600">
                      {method.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
              1
            </span>
            <span className="text-sm font-semibold text-slate-700">Dina uppgifter</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Förnamn *"
              value={formData.firstName || ''}
              onChange={(e) => updateField('firstName', e.target.value)}
              required
            />
            <input
              className="rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Efternamn *"
              value={formData.lastName || ''}
              onChange={(e) => updateField('lastName', e.target.value)}
              required
            />
          </div>

          <input
            className="w-full rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="E-post *"
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />

          <input
            className="w-full rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Mobilnummer *"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            required
          />

          <input
            className="w-full rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Gatuadress *"
            value={formData.streetAddress || ''}
            onChange={(e) => updateField('streetAddress', e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Postnummer *"
              value={formData.postalCode || ''}
              onChange={(e) => updateField('postalCode', e.target.value)}
              required
            />
            <input
              className="rounded-2xl border border-slate-300 p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Stad *"
              value={formData.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
              required
            />
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Land:</span>
              <span className="font-semibold text-slate-900">Sverige (SE)</span>
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Endast Sverige stöds för närvarande
            </p>
          </div>

          <div className="text-xs text-slate-500 text-center space-y-1">
            <p>
              Genom att slutföra köpet godkänner du{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline text-emerald-600">
                Köpvillkor
              </a>{' '}
              och{' '}
              <a href="/returns" target="_blank" rel="noopener noreferrer" className="underline text-emerald-600">
                Retur/Ångerrätt
              </a>.
            </p>
            <p>14 dagars ångerrätt från mottagande.</p>
          </div>

          <button
            type="submit"
            disabled={submitting || showPaymentForm}
            className="w-full rounded-full py-3.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting
              ? 'Skapar order…'
              : showPaymentForm
                ? '\u2713 Uppgifter sparade'
                : selectedProvider === PAYMENT_PROVIDERS.STRIPE
                  ? 'Fortsätt till betalning →'
                  : 'Betala med Klarna'}
          </button>

          <p className="text-xs text-center text-slate-500">
            * = obligatoriskt fält
          </p>
        </form>

        {/* ── Steg 2: Betalning (animeras in) ── */}
        <AnimatePresence>
          {showPaymentForm && orderId && (
            <motion.div
              ref={checkoutRef}
              key="payment"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  2
                </span>
                <h4 className="text-sm font-semibold text-slate-800">
                  Slutför betalning
                </h4>
              </div>
              {paymentError && (
                <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">{paymentError}</p>
                </div>
              )}
              <StripeCardPayment
                orderId={orderId}
                publicToken={orderPublicToken ?? ''}
                onSuccess={() => {
                  clearCart();
                  // Redirect happens via stripe.confirmPayment return_url
                }}
                onError={(error) => {
                  // Show the error inline but keep the payment form visible
                  // so the customer can retry on the same order.
                  setPaymentError(error);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
