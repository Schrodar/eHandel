import type { PublicOrder } from '@/lib/orders/queries';
import {
  mapInternalStatusToCustomerLabel,
  getProgressIndex,
  isNegativeState,
  TIMELINE_STEPS,
} from '@/lib/orders/statusMapping';

type Props = {
  order: NonNullable<PublicOrder>;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'long',
  }).format(new Date(value));
}

/** Mask personal name: "Anna Karlsson" → "Anna K." */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
}

/* ─── Icons (inline SVG, no external dep) ─────────────────────────── */

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
      />
    </svg>
  );
}

/* ─── Timeline ─────────────────────────────────────────────────────── */

function Timeline({
  progressIndex,
  negative,
}: {
  progressIndex: number;
  negative: boolean;
}) {
  return (
    <ol
      className={`relative space-y-0 ${negative ? 'opacity-40 pointer-events-none select-none' : ''}`}
      aria-label="Orderstatus"
    >
      {TIMELINE_STEPS.map((step, idx) => {
        const done = idx < progressIndex;
        const current = idx === progressIndex;
        const future = idx > progressIndex;

        return (
          <li key={step} className="flex gap-4">
            {/* Connector line + dot column */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-stone-800 bg-stone-800 text-white'
                    : current
                      ? 'border-stone-800 bg-white text-stone-800'
                      : 'border-stone-200 bg-white text-stone-300'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {done ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${current ? 'bg-stone-800' : 'bg-stone-200'}`}
                  />
                )}
              </div>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`mt-1 mb-1 w-0.5 flex-1 min-h-8 ${done ? 'bg-stone-800' : 'bg-stone-100'}`}
                />
              )}
            </div>

            {/* Label */}
            <div className="pb-6 pt-1">
              <p
                className={`text-sm font-medium leading-tight ${
                  done
                    ? 'text-stone-500'
                    : current
                      ? 'text-stone-900'
                      : future
                        ? 'text-stone-300'
                        : 'text-stone-500'
                }`}
              >
                {step}
              </p>
              {current && (
                <p className="mt-0.5 text-xs text-stone-400">Nuvarande status</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Card wrapper ─────────────────────────────────────────────────── */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-stone-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */

export default function OrderStatusPage({ order }: Props) {
  const progressIndex = getProgressIndex(order.orderStatus, order.paymentStatus);
  const negative = isNegativeState(order.orderStatus, order.paymentStatus);
  const customerLabel = mapInternalStatusToCustomerLabel(
    order.orderStatus,
    order.paymentStatus,
  );

  const hasTracking = Boolean(order.shippingTracking);

  return (
    <div className="min-h-screen bg-stone-50 px-4 py-10">
      <div className="mx-auto max-w-lg space-y-5">

        {/* ── Header ── */}
        <header className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">
            Orderstatus
          </p>
          <h1 className="text-2xl font-serif tracking-tight text-stone-900">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-stone-500">
            Beställd {formatDate(order.createdAt)}
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                negative
                  ? 'bg-rose-50 text-rose-700'
                  : progressIndex === 4
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-stone-100 text-stone-700'
              }`}
            >
              {customerLabel}
            </span>
          </div>
        </header>

        {/* ── Cancelled / Refunded alert ── */}
        {negative && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {order.paymentStatus === 'REFUNDED'
              ? 'Denna order har återbetalats.'
              : 'Denna order har avbrutits.'}
          </div>
        )}

        {/* ── Timeline ── */}
        <Card title="Statusflöde">
          <Timeline progressIndex={progressIndex} negative={negative} />
        </Card>

        {/* ── Delivery ── */}
        <Card title="Leverans">
          <div className="space-y-3 text-sm text-stone-700">
            <div className="flex items-start gap-3">
              <TruckIcon className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
              <div className="space-y-0.5">
                <p className="font-medium">{maskName(order.customerName)}</p>
                <p className="text-stone-500">
                  {order.shippingCity}, {order.shippingCountry}
                </p>
                {order.shippingCarrier && (
                  <p className="text-stone-500">
                    Fraktbolag:{' '}
                    <span className="font-medium text-stone-700">
                      {order.shippingCarrier}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {hasTracking && (
              <div className="mt-1">
                {/* TODO: Map shippingCarrier → real tracking URL */}
                <a
                  href={`https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall?shipmentId=${order.shippingTracking}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  Spåra paket →
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* ── Products ── */}
        <Card title="Produkter">
          <ul className="divide-y divide-stone-50">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0 text-sm"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-stone-900">{item.productName}</p>
                  {item.variantName && (
                    <p className="text-xs text-stone-400">{item.variantName}</p>
                  )}
                  <p className="text-xs text-stone-400">Antal: {item.quantity}</p>
                </div>
                <p className="shrink-0 font-medium text-stone-700">
                  {formatMoney(item.lineTotal, order.currency)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        {/* ── Summary ── */}
        <Card title="Sammanfattning">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <dt>Delsumma</dt>
              <dd>{formatMoney(order.subtotal, order.currency)}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>Frakt</dt>
              <dd>{formatMoney(order.shipping, order.currency)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <dt>Rabatt</dt>
                <dd>−{formatMoney(order.discount, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-100 pt-2 text-base font-semibold text-stone-900">
              <dt>Totalt</dt>
              <dd>{formatMoney(order.total, order.currency)}</dd>
            </div>
          </dl>
        </Card>

        <p className="text-center text-xs text-stone-300 pb-4">
          Frågor om din order? Kontakta oss via din orderbekräftelse.
        </p>
      </div>
    </div>
  );
}
