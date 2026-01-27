// app/components/CheckoutModal.tsx
'use client';

import { useState } from 'react';
import type { CustomerInfo } from './checkout';
import { validateCheckoutRequest, createCheckoutRequest } from './checkout';
import { useCartContext } from '@/context/CartProvider';
import { formatPrice } from './products';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (customer: CustomerInfo) => void;
};

export function CheckoutModal({ open, onClose, onSubmit }: Props) {
  const { cart, items } = useCartContext();
  const [formData, setFormData] = useState<Partial<CustomerInfo>>({
    country: 'SE', // Låst till Sverige
  });
  const [errors, setErrors] = useState<string[]>([]);

  if (!open) return null;

  // Beräkna totalsumma lokalt från cart items (öre)
  const orderTotal = items.reduce(
    (acc, it) => {
      const unit = it.unitPrice;
      const qty = it.quantity;
      const lineTotal = unit * qty;
      const divisor = 10000 + (it.taxRate ?? 2500);
      const lineExVat = Math.round((lineTotal * 10000) / divisor);
      const lineVat = lineTotal - lineExVat;
      acc.totalInclVatOre += lineTotal;
      acc.totalExVatOre += lineExVat;
      acc.totalVatOre += lineVat;
      acc.lineItems.push({ product: it as any, quantity: qty, lineTotal, lineVat });
      return acc;
    },
    { totalInclVatOre: 0, totalExVatOre: 0, totalVatOre: 0, lineItems: [] as any[] },
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Skapa customer object
    const customer: CustomerInfo = {
      email: formData.email || '',
      phone: formData.phone,
      firstName: formData.firstName || '',
      lastName: formData.lastName || '',
      streetAddress: formData.streetAddress || '',
      postalCode: formData.postalCode || '',
      city: formData.city || '',
      country: 'SE',
    };

    // Skapa checkout request
    const checkoutRequest = createCheckoutRequest(cart as any, customer);

    // Validera
    const validation = validateCheckoutRequest(checkoutRequest);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Rensa errors och fortsätt
    setErrors([]);

    // I produktion: skicka checkoutRequest till server
    console.log('Checkout Request:', checkoutRequest);
    console.log('Order Total (öre):', orderTotal.totalInclVatOre);

    // Skicka vidare till parent
    onSubmit(customer);
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
          <div className="mt-3 pt-3 border-t border-slate-300 flex justify-between">
            <span className="font-semibold text-slate-900">
              Totalt (inkl. moms)
            </span>
            <span className="font-bold text-slate-900">
              {formatPrice(orderTotal.totalInclVatOre)}
            </span>
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

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
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
            placeholder="Telefon (valfritt)"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
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

          <button
            type="submit"
            className="w-full rounded-full py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
          >
            Slutför beställning
          </button>

          <p className="text-xs text-center text-slate-500">
            * = obligatoriskt fält
          </p>
        </form>
      </div>
    </div>
  );
}
