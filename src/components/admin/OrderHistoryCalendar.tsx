'use client';

/**
 * OrderHistoryCalendar
 *
 * Swedish-standard monthly calendar:
 * - Weeks start on Monday
 * - ISO week numbers on the left column
 * - Highlights dates that have orders (passed in via `orderDates`)
 * - Click on a date → onDateClick(date: string) with YYYY-MM-DD
 * - Prev/Next month navigation → onMonthChange(year, month)
 */

import { useCallback } from 'react';

// ─── Swedish locale data ──────────────────────────────────────────────────────

const MONTHS_SE = [
  'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
  'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
];

const DAY_HEADERS_SE = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

// ─── ISO helpers ──────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Monday of the week containing `date` */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() - (day - 1));
  return d;
}

/** Build a calendar grid for a given year+month.
 *  Returns rows (weeks), each row has 7 cells (Mon–Sun) with Date | null. */
function buildCalendarGrid(year: number, month: number): { monday: Date; cells: (Date | null)[] }[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Find Monday of the first week shown
  const startMonday = getWeekMonday(firstDay);

  const rows: { monday: Date; cells: (Date | null)[] }[] = [];
  const cursor = new Date(startMonday);

  while (cursor <= lastDay || rows.length === 0) {
    const rowMonday = new Date(cursor);
    const cells: (Date | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(cursor);
      cells.push(cell.getMonth() === month - 1 ? new Date(cell) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    rows.push({ monday: rowMonday, cells });
    if (cursor > lastDay) break;
  }

  return rows;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export type CalendarOrderDate = {
  date: string; // YYYY-MM-DD
  count: number;
};

type Props = {
  year: number;
  month: number; // 1-based
  orderDates: CalendarOrderDate[];
  selectedDate?: string; // YYYY-MM-DD
  onDateClick: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
};

export default function OrderHistoryCalendar({
  year,
  month,
  orderDates,
  selectedDate,
  onDateClick,
  onMonthChange,
}: Props) {
  const orderDateSet = new Map(orderDates.map((d) => [d.date, d.count]));
  const grid = buildCalendarGrid(year, month);

  const today = toDateStr(new Date());

  const handlePrev = useCallback(() => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }, [year, month, onMonthChange]);

  const handleNext = useCallback(() => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }, [year, month, onMonthChange]);

  return (
    <div className="rounded-xl bg-white ring-1 ring-slate-200 shadow-sm select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button
          onClick={handlePrev}
          className="rounded p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Föregående månad"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-slate-900">
          {MONTHS_SE[month - 1]} {year}
        </span>
        <button
          onClick={handleNext}
          className="rounded p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Nästa månad"
        >
          ›
        </button>
      </div>

      <div className="p-2">
        {/* Day headers + week-nr column */}
        <div className="grid grid-cols-8 gap-px mb-1">
          <div className="text-center text-[10px] font-medium text-slate-400 py-1">V.</div>
          {DAY_HEADERS_SE.map((h) => (
            <div key={h} className="text-center text-[10px] font-medium text-slate-500 py-1">
              {h}
            </div>
          ))}
        </div>

        {/* Calendar rows */}
        {grid.map((row) => {
          const weekNum = getISOWeek(row.monday);
          return (
            <div key={toDateStr(row.monday)} className="grid grid-cols-8 gap-px">
              <div className="flex items-center justify-center text-[10px] text-slate-400 font-medium py-1">
                {weekNum}
              </div>
              {row.cells.map((cell, i) => {
                if (!cell) {
                  return <div key={i} className="py-1" />;
                }
                const dateStr = toDateStr(cell);
                const count = orderDateSet.get(dateStr) ?? 0;
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={dateStr}
                    onClick={() => onDateClick(dateStr)}
                    className={[
                      'relative flex flex-col items-center justify-center rounded py-1 text-xs transition-colors',
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : isToday
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700',
                    ].join(' ')}
                    title={count > 0 ? `${count} order${count > 1 ? 'ar' : ''}` : undefined}
                  >
                    {cell.getDate()}
                    {count > 0 && (
                      <span
                        className={[
                          'absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                          isSelected ? 'bg-white' : 'bg-slate-900',
                        ].join(' ')}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
