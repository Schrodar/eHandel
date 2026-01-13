// app/components/CheckoutModal.tsx
"use client";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function CheckoutModal({ open, onClose, onSubmit }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Kassan (utkast)</h3>

          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm font-semibold bg-slate-100 hover:bg-slate-200"
          >
            Stäng
          </button>
        </div>

        <p className="mt-2 text-slate-600">
          Här kopplar vi senare Stripe/Klarna. Just nu är detta bara form + design.
        </p>

        <form
          className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input className="rounded-2xl border p-3" placeholder="Förnamn" required />
          <input className="rounded-2xl border p-3" placeholder="Efternamn" required />
          <input
            className="sm:col-span-2 rounded-2xl border p-3"
            placeholder="Email"
            type="email"
            required
          />
          <input
            className="sm:col-span-2 rounded-2xl border p-3"
            placeholder="Adress"
            required
          />

          <button className="sm:col-span-2 rounded-full py-3 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition">
            Slutför (utkast)
          </button>
        </form>
      </div>
    </div>
  );
}
