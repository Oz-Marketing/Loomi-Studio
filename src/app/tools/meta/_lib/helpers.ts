/**
 * Pure formatting + parsing helpers shared by the Meta Ad Planner / Pacer
 * pages. No React, no DOM. Date strings throughout the tool are local-time
 * `YYYY-MM-DD` to mirror `<input type="date">`.
 */

import { toIso } from '@/components/ui/date-picker';
import { COLORS } from './constants';
import { randomUUID } from './random-id';
import type { PacerAd } from './types';

export function fmt(val: number | string | null | undefined): string {
  const n = Number(val ?? 0);
  if (isNaN(n)) return '$0.00';
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Days inclusive between two ISO dates. Returns 0 if either is missing. */
export function calcDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  return Math.max(
    0,
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / 86400000,
    ) + 1,
  );
}

/** Days between flight start and "today" (clamped to flight window). */
export function calcElapsed(start: string | null, end: string | null): number {
  if (!start) return 0;
  const startMs = new Date(start + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const endMs = end ? new Date(end + 'T00:00:00').getTime() : todayMs;
  const cap = Math.min(todayMs, endMs);
  if (cap < startMs) return 0;
  return Math.ceil((cap - startMs) / 86400000) + 1;
}

/** Walk back n business days from an ISO date (used for Due Date auto-calc). */
export function subtractBusinessDays(dateStr: string, n: number): string {
  // Walks in local time so the returned ISO matches the calendar day the
  // user sees in their browser; using toISOString() here would silently roll
  // forward a day for users east of UTC.
  const d = new Date(dateStr + 'T00:00:00');
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() - 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return toIso(d);
}

/** Default Due Date = 2 business days before flight start. */
export function autoDueDateFromFlightStart(
  flightStart: string | null,
): string | null {
  if (!flightStart) return null;
  return subtractBusinessDays(flightStart, 2);
}

export type DueDateUrgency = {
  level: 'overdue' | 'today' | 'soon' | 'upcoming';
  daysFromNow: number;
};

export function classifyDueDate(ad: PacerAd): DueDateUrgency | null {
  if (!ad.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(ad.dueDate + 'T00:00:00');
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { level: 'overdue', daysFromNow: diff };
  if (diff === 0) return { level: 'today', daysFromNow: 0 };
  if (diff <= 3) return { level: 'soon', daysFromNow: diff };
  if (diff <= 7) return { level: 'upcoming', daysFromNow: diff };
  return null;
}

export function num(s: string | null | undefined): number | null {
  if (s == null || s === '') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

export const newAdId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : randomUUID();

export function makeAd(position: number, period: string): PacerAd {
  return {
    id: newAdId(),
    position,
    name: '',
    period,
    ownerUserId: null,
    designerUserId: null,
    accountRepUserId: null,
    actionNeeded: null,
    recurring: 'No',
    coop: 'No',
    budgetType: 'Daily',
    budgetSource: 'base',
    splitBaseAmount: null,
    flightStart: null,
    flightEnd: null,
    liveDate: null,
    creativeDueDate: null,
    dueDate: null,
    dateCompleted: null,
    adStatus: 'Working on it',
    designStatus: 'Not Started',
    internalApproval: 'Pending Approval',
    clientApproval: 'Pending Approval',
    allocation: null,
    pacerActual: null,
    pacerDailyBudget: null,
    pacerTodayDate: null,
    pacerEndDate: null,
    creativeLink: null,
    clientName: null,
    digitalDetails: null,
    metaObjectType: null,
    metaObjectId: null,
    metaEffectiveStatus: null,
    pacerSyncedAt: null,
    pacerRunSpend: null,
    fullRunAppliedToMonth: null,
    lifetimeMonthSplit: null,
    metaStartDate: null,
    metaEndDate: null,
    alertsMuted: false,
    designNotes: [],
    activityLog: [],
  };
}

export function fmtBytes(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reformat a YYYY-MM-DD ISO date into the user-facing MM-DD-YYYY layout. */
export function fmtFullDate(d: string | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${m}-${day}-${y}`;
}

/**
 * Bare fractional-days number for display — 2 decimals so a partial first/last
 * day is visible, with trailing zeros trimmed so clean days stay tidy: 1.0183 →
 * "1.02", 2 → "2", 2.5 → "2.5". The math itself keeps full precision; we only
 * round for display, never re-sum the rounded value.
 */
export function fmtDaysNum(days: number): string {
  const rounded = Math.round(days * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0$/, '');
}

/** Fractional days-remaining with a unit, e.g. "1.02 days" / "2 days". */
export function fmtDaysLeft(days: number): string {
  return `${fmtDaysNum(days)} day${Math.round(days * 100) / 100 === 1 ? '' : 's'}`;
}

/**
 * Higher-precision day count for the Rec. Daily "basis" line. Normal values
 * read at 2 decimals ("5.34"), but a value a hair over a whole day — e.g.
 * 1.0032, which 2 decimals would hide as "1.00" — bumps to 4 decimals so
 * `remaining ÷ days` visibly reconciles. Trailing zeros trimmed.
 */
export function fmtDaysBasis(days: number): string {
  const r2 = Math.round(days * 100) / 100;
  const decimals = Number.isInteger(r2) && !Number.isInteger(days) ? 4 : 2;
  return days.toFixed(decimals).replace(/\.?0+$/, '');
}

/** "1.0032 days" / "1 day" — the divisor phrase for the Rec. Daily basis. */
export function fmtDaysBasisPhrase(days: number): string {
  const n = fmtDaysBasis(days);
  return `${n} day${n === '1' ? '' : 's'}`;
}

// Display helpers for the three budget sources (Base / Added / Split).
// Centralized so adding a new source later only touches one place, and so the
// Split tint stays consistent with the lifetime/violet accent in the editor.
export function sourceLabel(s: 'base' | 'added' | 'split'): string {
  return s === 'base' ? 'Base' : s === 'added' ? 'Added' : 'Split';
}
export function sourceColor(s: 'base' | 'added' | 'split'): string {
  return s === 'base' ? COLORS.base : s === 'added' ? COLORS.added : COLORS.split;
}
export function sourceTint(s: 'base' | 'added' | 'split'): string {
  return s === 'base'
    ? 'rgba(56,189,248,0.18)'
    : s === 'added'
      ? 'rgba(52,211,153,0.18)'
      : 'rgba(244,114,182,0.22)';
}
