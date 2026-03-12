/**
 * src/lib/admin/orderHistoryUtils.ts
 *
 * Pure (no Prisma, no server-only) utility functions and types for order history.
 * Safe to import from both Server and Client Components.
 */

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

export type DayGroup = {
  date: string; // ISO date YYYY-MM-DD
  orders: HistoryOrderRow[];
};

export type WeekGroup = {
  isoWeek: number;
  isoYear: number;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string;   // YYYY-MM-DD
  days: DayGroup[];
};

// ─── ISO week helpers ─────────────────────────────────────────────────────────

export function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function getISOWeekYear(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  return d.getUTCFullYear();
}

export function getISOWeekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return new Date(d.toISOString().substring(0, 10) + 'T00:00:00.000Z');
}

export function getISOWeekEnd(date: Date): Date {
  const start = getISOWeekStart(date);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// ─── Week grouping ────────────────────────────────────────────────────────────

export function groupOrdersByWeek(orders: HistoryOrderRow[]): WeekGroup[] {
  const weekMap = new Map<string, WeekGroup>();

  for (const order of orders) {
    const d = new Date(order.createdAt);
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
    let day = week.days.find((dd) => dd.date === dateStr);
    if (!day) {
      day = { date: dateStr, orders: [] };
      week.days.push(day);
    }
    day.orders.push(order);
  }

  const weeks = Array.from(weekMap.values()).sort((a, b) => {
    if (b.isoYear !== a.isoYear) return b.isoYear - a.isoYear;
    return b.isoWeek - a.isoWeek;
  });

  for (const week of weeks) {
    week.days.sort((a, b) => b.date.localeCompare(a.date));
  }

  return weeks;
}
