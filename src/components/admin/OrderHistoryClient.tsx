'use client';

/**
 * OrderHistoryClient
 *
 * Full client-side order history with:
 * - Search (order number, name, email, phone)
 * - Filters (status, payment status, date range)
 * - Calendar navigation (Swedish ISO weeks)
 * - Week-grouped order list
 * - Quick actions: copy number, copy email, open order
 * - Inline note & flag
 * - CSV export
 * - Load more pagination
 */

import { useState, useCallback, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import OrderHistoryCalendar, { type CalendarOrderDate } from './OrderHistoryCalendar';
import type { HistoryOrderRow, WeekGroup } from '@/lib/admin/orderHistoryUtils';
import { groupOrdersByWeek } from '@/lib/admin/orderHistoryUtils';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ─── Swedish helpers ──────────────────────────────────────────────────────────

const MONTHS_SE = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
];

const DAYS_SE: Record<number, string> = {
  1: 'Måndag', 2: 'Tisdag', 3: 'Onsdag', 4: 'Torsdag',
  5: 'Fredag', 6: 'Lördag', 0: 'Söndag',
};

function formatSEDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_SE[date.getMonth()]} ${date.getFullYear()}`;
}

function formatSEDateTime(date: Date): string {
  return `${formatSEDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatCurrency(amountInOre: number, currency: string): string {
  return `${Math.round(amountInOre / 100).toLocaleString('sv-SE')} ${currency.toUpperCase()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  initialOrders: HistoryOrderRow[];
  initialTotal: number;
  initialCalendarDates: CalendarOrderDate[];
  initialYear: number;
  initialMonth: number;
};

type NoteState = {
  [orderId: string]: { note: string; flagged: boolean; saving: boolean };
};

// ─── Status labels ────────────────────────────────────────────────────────────

const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Ny', READY_TO_PICK: 'Redo att plocka', PICKING: 'Plockas', PACKED: 'Packad',
  SHIPPED: 'Skickad', COMPLETED: 'Klar', CANCELLED: 'Avbruten',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Väntande', AUTHORIZED: 'Auktoriserad', CAPTURED: 'Betald',
  CANCELLED: 'Avbruten', REFUNDED: 'Återbetald', FAILED: 'Misslyckad',
};

function paymentBadge(s: string): string {
  if (s === 'CAPTURED') return 'bg-green-100 text-green-800';
  if (s === 'FAILED' || s === 'CANCELLED') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
}

// ─── Order Row ────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  noteState,
  onNoteChange,
  onFlagToggle,
  onNoteSave,
}: {
  order: HistoryOrderRow;
  noteState: { note: string; flagged: boolean; saving: boolean };
  onNoteChange: (id: string, note: string) => void;
  onFlagToggle: (id: string) => void;
  onNoteSave: (id: string) => void;
}) {
  const [copied, setCopied] = useState<'num' | 'email' | null>(null);
  const [showNote, setShowNote] = useState(false);

  const copy = useCallback((text: string, which: 'num' | 'email') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  return (
    <div
      className={[
        'rounded-lg border transition-colors',
        noteState.flagged
          ? 'border-amber-300 bg-amber-50'
          : 'border-slate-100 bg-white hover:border-slate-200',
      ].join(' ')}
    >
      {/* Main row */}
      <div className="flex flex-wrap items-start gap-3 p-3 sm:items-center">
        {/* Flag button */}
        <button
          onClick={() => onFlagToggle(order.id)}
          title={noteState.flagged ? 'Märkt – klicka för att ta bort' : 'Markera'}
          className={[
            'shrink-0 text-lg transition-colors',
            noteState.flagged ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400',
          ].join(' ')}
        >
          {noteState.flagged ? '🚩' : '⚑'}
        </button>

        {/* Order info */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900">
              {order.orderNumber}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentBadge(order.paymentStatus)}`}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {order.customerName} · {order.customerEmail}
            {order.customerPhone ? ` · ${order.customerPhone}` : ''}
          </p>
          <p className="text-xs text-slate-400">
            {formatSEDateTime(new Date(order.createdAt))} · {order.itemCount} vara{order.itemCount !== 1 ? 'r' : ''} ·{' '}
            <strong className="text-slate-700">{formatCurrency(order.total, order.currency)}</strong>
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            title="Kopiera ordernummer"
            onClick={() => copy(order.orderNumber, 'num')}
            className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {copied === 'num' ? '✓' : '📋'}
          </button>
          <button
            title="Kopiera email"
            onClick={() => copy(order.customerEmail, 'email')}
            className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            {copied === 'email' ? '✓' : '✉'}
          </button>
          <button
            title="Intern anteckning"
            onClick={() => setShowNote((v) => !v)}
            className={[
              'rounded p-1.5 text-xs transition-colors',
              noteState.note
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
            ].join(' ')}
          >
            {noteState.note ? '📝' : '✏'}
          </button>
          <Link
            href={`/admin/orders/${order.id}`}
            title="Öppna order"
            className="rounded p-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            →
          </Link>
        </div>
      </div>

      {/* Inline note editor */}
      {showNote && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
          <textarea
            value={noteState.note}
            onChange={(e) => onNoteChange(order.id, e.target.value)}
            placeholder="Intern anteckning (syns bara i admin)…"
            rows={2}
            className="w-full resize-none rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
          />
          <div className="mt-1.5 flex justify-end gap-2">
            <button
              onClick={() => setShowNote(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Avbryt
            </button>
            <button
              onClick={() => onNoteSave(order.id)}
              disabled={noteState.saving}
              className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {noteState.saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week group header ────────────────────────────────────────────────────────

function WeekHeader({ group }: { group: WeekGroup }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-slate-200 pb-1 mb-3">
      <span className="text-base font-bold text-slate-900">Vecka {group.isoWeek}</span>
      <span className="text-sm text-slate-500">
        {formatSEDate(new Date(group.weekStart + 'T00:00:00'))} –{' '}
        {formatSEDate(new Date(group.weekEnd + 'T00:00:00'))}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrderHistoryClient({
  initialOrders,
  initialTotal,
  initialCalendarDates,
  initialYear,
  initialMonth,
}: Props) {
  // ── Search + filter state ───────────────────────────────────────────────────
  const [q, setQ] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Calendar state ──────────────────────────────────────────────────────────
  const [calYear, setCalYear] = useState(initialYear);
  const [calMonth, setCalMonth] = useState(initialMonth);
  const [calendarDates, setCalendarDates] = useState<CalendarOrderDate[]>(initialCalendarDates);
  const [selectedCalDate, setSelectedCalDate] = useState<string>();

  // ── Orders state ────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<HistoryOrderRow[]>(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // ── Note/flag state ─────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<NoteState>(() => {
    const s: NoteState = {};
    for (const o of initialOrders) {
      s[o.id] = { note: o.adminNote ?? '', flagged: o.flagged, saving: false };
    }
    return s;
  });

  const getNoteState = useCallback(
    (id: string) => notes[id] ?? { note: '', flagged: false, saving: false },
    [notes],
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const PAGE_SIZE = 40;

  // ── Fetch function ──────────────────────────────────────────────────────────
  const fetchOrders = useCallback(
    async (opts: {
      q: string; orderStatus: string; paymentStatus: string;
      fromDate: string; toDate: string; page: number; append?: boolean;
    }) => {
      setLoading(true);
      try {
        const sp = new URLSearchParams();
        if (opts.q) sp.set('q', opts.q);
        if (opts.orderStatus) sp.set('orderStatus', opts.orderStatus);
        if (opts.paymentStatus) sp.set('paymentStatus', opts.paymentStatus);
        if (opts.fromDate) sp.set('from', opts.fromDate + 'T00:00:00.000Z');
        if (opts.toDate) sp.set('to', opts.toDate + 'T23:59:59.999Z');
        sp.set('page', String(opts.page));
        sp.set('pageSize', String(PAGE_SIZE));

        const res = await fetch(`/api/admin/orders/history?${sp.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        // Serialize dates
        const newOrders: HistoryOrderRow[] = data.orders.map((o: HistoryOrderRow) => ({
          ...o,
          createdAt: new Date(o.createdAt),
          shippedAt: o.shippedAt ? new Date(o.shippedAt) : null,
        }));

        setTotal(data.total);
        if (opts.append) {
          setOrders((prev) => {
            const existing = new Set(prev.map((o) => o.id));
            return [...prev, ...newOrders.filter((o) => !existing.has(o.id))];
          });
        } else {
          setOrders(newOrders);
        }

        // Ensure note state exists for loaded orders
        setNotes((prev) => {
          const next = { ...prev };
          for (const o of newOrders) {
            if (!next[o.id]) {
              next[o.id] = { note: o.adminNote ?? '', flagged: o.flagged, saving: false };
            }
          }
          return next;
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Calendar month change ───────────────────────────────────────────────────
  const handleMonthChange = useCallback(async (year: number, month: number) => {
    setCalYear(year);
    setCalMonth(month);
    const sp = new URLSearchParams({ calendar: '1', year: String(year), month: String(month) });
    const res = await fetch(`/api/admin/orders/history?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setCalendarDates(data.days);
    }
  }, []);

  // ── Calendar date click: jump to that week ──────────────────────────────────
  const handleDateClick = useCallback(
    (date: string) => {
      const d = new Date(date + 'T12:00:00');
      // Monday of clicked date's week
      const day = d.getDay() || 7;
      const monday = new Date(d);
      monday.setDate(d.getDate() - (day - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const fromStr = monday.toISOString().substring(0, 10);
      const toStr = sunday.toISOString().substring(0, 10);

      setSelectedCalDate(date);
      setFromDate(fromStr);
      setToDate(toStr);
      setPage(1);

      startTransition(() => {
        fetchOrders({ q, orderStatus, paymentStatus, fromDate: fromStr, toDate: toStr, page: 1 });
      });
    },
    [q, orderStatus, paymentStatus, fetchOrders],
  );

  // ── Debounced search ────────────────────────────────────────────────────────
  const handleQueryChange = useCallback(
    (value: string) => {
      setQ(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPage(1);
        fetchOrders({ q: value, orderStatus, paymentStatus, fromDate, toDate, page: 1 });
      }, 350);
    },
    [orderStatus, paymentStatus, fromDate, toDate, fetchOrders],
  );

  // ── Filter changes ──────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (opts?: { orderStatus?: string; paymentStatus?: string; fromDate?: string; toDate?: string }) => {
      const os = opts?.orderStatus ?? orderStatus;
      const ps = opts?.paymentStatus ?? paymentStatus;
      const fd = opts?.fromDate ?? fromDate;
      const td = opts?.toDate ?? toDate;
      setPage(1);
      fetchOrders({ q, orderStatus: os, paymentStatus: ps, fromDate: fd, toDate: td, page: 1 });
    },
    [q, orderStatus, paymentStatus, fromDate, toDate, fetchOrders],
  );

  const clearFilters = useCallback(() => {
    setQ('');
    setOrderStatus('');
    setPaymentStatus('');
    setFromDate('');
    setToDate('');
    setSelectedCalDate(undefined);
    setPage(1);
    fetchOrders({ q: '', orderStatus: '', paymentStatus: '', fromDate: '', toDate: '', page: 1 });
  }, [fetchOrders]);

  // ── Load more ───────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOrders({ q, orderStatus, paymentStatus, fromDate, toDate, page: nextPage, append: true });
  }, [q, orderStatus, paymentStatus, fromDate, toDate, page, fetchOrders]);

  // ── Note / flag actions ─────────────────────────────────────────────────────
  const handleNoteChange = useCallback((id: string, note: string) => {
    setNotes((prev) => ({ ...prev, [id]: { ...prev[id], note } }));
  }, []);

  const handleFlagToggle = useCallback((id: string) => {
    const current = notes[id] ?? { note: '', flagged: false, saving: false };
    const newFlagged = !current.flagged;
    setNotes((prev) => ({ ...prev, [id]: { ...prev[id], flagged: newFlagged } }));
    fetch(`/api/admin/orders/${id}/note`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagged: newFlagged }),
    }).catch(console.error);
  }, [notes]);

  const handleNoteSave = useCallback(
    async (id: string) => {
      setNotes((prev) => ({ ...prev, [id]: { ...prev[id], saving: true } }));
      try {
        await fetch(`/api/admin/orders/${id}/note`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminNote: notes[id]?.note ?? null }),
        });
      } finally {
        setNotes((prev) => ({ ...prev, [id]: { ...prev[id], saving: false } }));
      }
    },
    [notes],
  );

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (orderStatus) sp.set('orderStatus', orderStatus);
    if (paymentStatus) sp.set('paymentStatus', paymentStatus);
    if (fromDate) sp.set('from', fromDate + 'T00:00:00.000Z');
    if (toDate) sp.set('to', toDate + 'T23:59:59.999Z');
    window.open(`/api/admin/orders/history/export?${sp.toString()}`, '_blank');
  }, [q, orderStatus, paymentStatus, fromDate, toDate]);

  // ── Group orders into weeks ─────────────────────────────────────────────────
  const weekGroups = groupOrdersByWeek(orders);
  const hasMore = orders.length < total;

  const activeFilters = [q, orderStatus, paymentStatus, fromDate, toDate].some(Boolean);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* ── Left: Calendar ─────────────────────────────────────────────────── */}
      <div className="w-full lg:w-64 shrink-0 space-y-4">
        <OrderHistoryCalendar
          year={calYear}
          month={calMonth}
          orderDates={calendarDates}
          selectedDate={selectedCalDate}
          onDateClick={handleDateClick}
          onMonthChange={handleMonthChange}
        />

        <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-3 text-xs text-slate-500 space-y-1">
          <p className="font-medium text-slate-700">Kalendernavigering</p>
          <p>Klicka på ett datum för att hoppa till den veckans ordrar.</p>
          <p>Prickar under datum = ordrar den dagen.</p>
        </div>
      </div>

      {/* ── Right: Search + Filter + Orderlist ─────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Search + filter bar */}
        <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-4 space-y-3">
          {/* Search */}
          <input
            type="search"
            value={q}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Sök ordernummer, namn, email, telefon…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-slate-400 focus:outline-none"
          />

          <div className="flex flex-wrap gap-2">
            {/* Order status */}
            <select
              value={orderStatus}
              onChange={(e) => {
                setOrderStatus(e.target.value);
                applyFilters({ orderStatus: e.target.value });
              }}
              className="flex-1 min-w-32 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">Alla ordrar</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            {/* Payment status */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                applyFilters({ paymentStatus: e.target.value });
              }}
              className="flex-1 min-w-32 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="">Alla betalstatus</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            {/* From date */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                applyFilters({ fromDate: e.target.value });
              }}
              className="flex-1 min-w-32 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
              title="Från datum"
            />

            {/* To date */}
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                applyFilters({ toDate: e.target.value });
              }}
              className="flex-1 min-w-32 rounded border border-slate-200 px-2 py-1.5 text-xs text-slate-700 focus:outline-none"
              title="Till datum"
            />

            {/* Clear + Export */}
            {activeFilters && (
              <button
                onClick={clearFilters}
                className="rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Rensa
              </button>
            )}
            <button
              onClick={handleExport}
              className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 transition-colors"
            >
              Exportera CSV
            </button>
          </div>
        </div>

        {/* Summary line */}
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            {loading
              ? 'Laddar…'
              : total === 0
                ? 'Inga ordrar i historiken'
                : `${total} order${total !== 1 ? 'ar' : ''} totalt, visar ${orders.length}`}
          </span>
          {selectedCalDate && (
            <button
              onClick={() => {
                setSelectedCalDate(undefined);
                setFromDate('');
                setToDate('');
                applyFilters({ fromDate: '', toDate: '' });
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Rensa datumfilter
            </button>
          )}
        </div>

        {/* Week groups */}
        {weekGroups.length === 0 && !loading && (
          <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm p-8 text-center text-slate-500 text-sm">
            Inga ordrar matchar dina filter.
          </div>
        )}

        <div className="space-y-8">
          {weekGroups.map((week) => (
            <section key={`${week.isoYear}-W${week.isoWeek}`}>
              <WeekHeader group={week} />
              <div className="space-y-4">
                {week.days.map((day) => {
                  const dayDate = new Date(day.date + 'T12:00:00');
                  const dayName = DAYS_SE[dayDate.getDay()];
                  return (
                    <div key={day.date}>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
                        <span>{dayName}</span>
                        <span className="text-slate-400 text-xs">
                          {dayDate.getDate()} {MONTHS_SE[dayDate.getMonth()]}
                        </span>
                        <span className="ml-auto text-xs text-slate-400">
                          {day.orders.length} order{day.orders.length !== 1 ? 'ar' : ''}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {day.orders.map((order) => (
                          <OrderRow
                            key={order.id}
                            order={order}
                            noteState={getNoteState(order.id)}
                            onNoteChange={handleNoteChange}
                            onFlagToggle={handleFlagToggle}
                            onNoteSave={handleNoteSave}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Laddar…' : `Ladda fler (${total - orders.length} kvar)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
