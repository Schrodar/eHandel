import type { Metadata } from 'next';
import { listHistoryOrders, getHistoryCalendarMonth } from '@/lib/admin/orderHistoryService';
import OrderHistoryClient from '@/components/admin/OrderHistoryClient';

export const metadata: Metadata = { title: 'Orderhistorik – Admin' };
export const dynamic = 'force-dynamic';

export default async function OrderHistoryPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const [{ orders, total }, calendarDates] = await Promise.all([
      listHistoryOrders({ page: 1, pageSize: 40 }),
      getHistoryCalendarMonth(year, month),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Orderhistorik</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Skickade ordrar äldre än 24 timmar
            </p>
          </div>
        </div>

        <OrderHistoryClient
          initialOrders={orders}
          initialTotal={total}
          initialCalendarDates={calendarDates}
          initialYear={year}
          initialMonth={month}
        />
      </div>
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isMissingColumn =
      msg.includes('does not exist in the current database') ||
      msg.includes('P2022');

    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-slate-900">Orderhistorik</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <p className="font-semibold mb-2">
            {isMissingColumn
              ? 'Databas-migration krävs'
              : 'Ett fel uppstod'}
          </p>
          {isMissingColumn ? (
            <>
              <p className="mb-3">
                Kolumnerna <code className="font-mono bg-amber-100 px-1 rounded">adminNote</code> och{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">flagged</code> saknas i
                produktionsdatabasen. Kör följande SQL i{' '}
                <strong>Supabase → SQL Editor</strong>:
              </p>
              <pre className="rounded bg-amber-100 p-3 text-xs overflow-x-auto">
{`ALTER TABLE "Order" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "flagged" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Order_shippedAt_idx" ON "Order"("shippedAt");`}
              </pre>
              <p className="mt-3 text-xs text-amber-700">
                Ladda om sidan efter att SQL körts.
              </p>
            </>
          ) : (
            <p className="text-xs font-mono break-all">{msg}</p>
          )}
        </div>
      </div>
    );
  }
}
