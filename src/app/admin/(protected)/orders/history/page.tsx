import type { Metadata } from 'next';
import { listHistoryOrders, getHistoryCalendarMonth, groupOrdersByWeek } from '@/lib/admin/orderHistoryService';
import OrderHistoryClient from '@/components/admin/OrderHistoryClient';

export const metadata: Metadata = { title: 'Orderhistorik – Admin' };
export const dynamic = 'force-dynamic';

export default async function OrderHistoryPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

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
}
