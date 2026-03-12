import 'server-only';

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HistoryOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  total: number;
  currency: string;
  createdAt: Date;
  shippedAt: Date | null;
  flagged: boolean;
  adminNote: string | null;
  itemCount: number;
};

export type HistoryFilters = {
  query?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the cutoff date: 24 h ago. Orders SHIPPED before this belong to history. */
export function getHistoryCutoff(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

/** ISO week number (1-based). Weeks start on Monday (ISO 8601). */
export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** ISO week year (can differ from calendar year for first/last days of year). */
export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  return d.getUTCFullYear();
}

/** Returns Monday of the ISO week containing `date`. */
export function getISOWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return new Date(d.toISOString().substring(0, 10) + 'T00:00:00.000Z');
}

/** Returns Sunday (end-of-day) of the ISO week containing `date`. */
export function getISOWeekEnd(date: Date): Date {
  const start = getISOWeekStart(date);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// ─── Base WHERE clause for history orders ─────────────────────────────────────

function buildHistoryWhere(filters: HistoryFilters): Prisma.OrderWhereInput {
  const cutoff = getHistoryCutoff();

  // History = SHIPPED more than 24 h ago
  const baseWhere: Prisma.OrderWhereInput = {
    orderStatus: OrderStatus.SHIPPED,
    shippedAt: { lt: cutoff },
  };

  if (filters.paymentStatus) {
    baseWhere.paymentStatus = filters.paymentStatus;
  }

  if (filters.orderStatus && filters.orderStatus !== OrderStatus.SHIPPED) {
    // If caller explicitly filters for a non-shipped status, return nothing
    // (history only contains shipped orders for now).
    baseWhere.orderStatus = filters.orderStatus;
  }

  // Date range filter operates on `createdAt` (when order was placed)
  if (filters.from || filters.to) {
    baseWhere.createdAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }

  // Full-text search across customer fields and order identifiers
  const q = filters.query?.trim();
  if (q) {
    baseWhere.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: q, mode: 'insensitive' } },
    ];
  }

  return baseWhere;
}

// ─── List history orders (paginated) ──────────────────────────────────────────

export async function listHistoryOrders(filters: HistoryFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 40));
  const where = buildHistoryWhere(filters);

  const [rows, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        paymentStatus: true,
        orderStatus: true,
        total: true,
        currency: true,
        createdAt: true,
        shippedAt: true,
        flagged: true,
        adminNote: true,
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const orders: HistoryOrderRow[] = rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    customerName: r.customerName,
    customerEmail: r.customerEmail,
    customerPhone: r.customerPhone,
    paymentStatus: r.paymentStatus,
    orderStatus: r.orderStatus,
    total: r.total,
    currency: r.currency,
    createdAt: r.createdAt,
    shippedAt: r.shippedAt,
    flagged: r.flagged,
    adminNote: r.adminNote,
    itemCount: r._count.items,
  }));

  return { orders, total, page, pageSize };
}

// ─── Week groups ──────────────────────────────────────────────────────────────

export type DayGroup = {
  date: string; // ISO date YYYY-MM-DD (local Sweden time stored as UTC midnight)
  orders: HistoryOrderRow[];
};

export type WeekGroup = {
  isoWeek: number;
  isoYear: number;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: DayGroup[];
};

/** Groups a flat list of history orders into week → day buckets. */
export function groupOrdersByWeek(orders: HistoryOrderRow[]): WeekGroup[] {
  const weekMap = new Map<string, WeekGroup>();

  for (const order of orders) {
    const d = order.createdAt;
    const isoWeek = getISOWeek(d);
    const isoYear = getISOWeekYear(d);
    const key = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
    const dateStr = d.toISOString().substring(0, 10);

    if (!weekMap.has(key)) {
      const weekStart = getISOWeekStart(d);
      const weekEnd = getISOWeekEnd(d);
      weekMap.set(key, {
        isoWeek,
        isoYear,
        weekStart: weekStart.toISOString().substring(0, 10),
        weekEnd: weekEnd.toISOString().substring(0, 10),
        days: [],
      });
    }

    const week = weekMap.get(key)!;
    let day = week.days.find((d) => d.date === dateStr);
    if (!day) {
      day = { date: dateStr, orders: [] };
      week.days.push(day);
    }
    day.orders.push(order);
  }

  // Sort: newest week first; within week, newest day first
  const weeks = Array.from(weekMap.values()).sort((a, b) => {
    if (b.isoYear !== a.isoYear) return b.isoYear - a.isoYear;
    return b.isoWeek - a.isoWeek;
  });

  for (const week of weeks) {
    week.days.sort((a, b) => b.date.localeCompare(a.date));
  }

  return weeks;
}

// ─── Calendar summary (how many orders per date in a month) ──────────────────

export type CalendarDaySummary = {
  date: string; // YYYY-MM-DD
  count: number;
};

export async function getHistoryCalendarMonth(
  year: number,
  month: number, // 1-based
): Promise<CalendarDaySummary[]> {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const cutoff = getHistoryCutoff();

  const orders = await prisma.order.findMany({
    where: {
      orderStatus: OrderStatus.SHIPPED,
      shippedAt: { lt: cutoff },
      createdAt: { gte: from, lte: to },
    },
    select: { createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const counts = new Map<string, number>();
  for (const o of orders) {
    const dateStr = o.createdAt.toISOString().substring(0, 10);
    counts.set(dateStr, (counts.get(dateStr) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

// ─── Get full order for detail view ───────────────────────────────────────────

export async function getHistoryOrderDetail(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
}

// ─── CSV export ───────────────────────────────────────────────────────────────

export async function exportHistoryCSV(filters: HistoryFilters): Promise<string> {
  const where = buildHistoryWhere(filters);
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000, // safety cap
    select: {
      orderNumber: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      paymentStatus: true,
      orderStatus: true,
      total: true,
      currency: true,
      createdAt: true,
      shippedAt: true,
      shippingCarrier: true,
      shippingTracking: true,
      flagged: true,
      adminNote: true,
    },
  });

  const SEP = ';';
  const header = [
    'Ordernummer',
    'Skapad',
    'Skickad',
    'Kundnamn',
    'Email',
    'Telefon',
    'Orderstatus',
    'Betalstatus',
    'Totalt (öre)',
    'Valuta',
    'Fraktbolag',
    'Spårningsnummer',
    'Flaggad',
    'Intern anteckning',
  ].join(SEP);

  const csvEsc = (v: string | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(SEP) || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const rows = orders.map((o) =>
    [
      o.orderNumber,
      o.createdAt.toISOString(),
      o.shippedAt?.toISOString() ?? '',
      o.customerName,
      o.customerEmail,
      o.customerPhone ?? '',
      o.orderStatus,
      o.paymentStatus,
      String(o.total),
      o.currency,
      o.shippingCarrier ?? '',
      o.shippingTracking ?? '',
      o.flagged ? 'Ja' : 'Nej',
      o.adminNote ?? '',
    ]
      .map(csvEsc)
      .join(SEP),
  );

  return [header, ...rows].join('\n');
}
