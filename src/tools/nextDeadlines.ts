/**
 * `next_deadlines` — "what statutory filing is due next?"
 *
 * `compliance_deadlines` lists every filing statically; agents (and voice
 * callers especially) really want the *time-aware* answer: what is coming up,
 * soonest first. This tool computes the next concrete due date for each catalog
 * entry relative to a reference date and returns them sorted.
 *
 * Honesty over precision: a concrete `nextDue` is computed ONLY when it can be
 * placed unambiguously — a monthly filing with a `dueDay`, or any entry with
 * explicit `annualDates`. Quarterly/half-yearly entries that give only a
 * day-of-month (no month) and per-event filings are returned with
 * `scheduleVaries: true` and `nextDue: null`, pointing the caller at `source`.
 * Dates rotate annually; every response repeats that disclaimer.
 */
import { z } from 'zod';
import {
  COMPLIANCE_DEADLINES,
  type Deadline,
} from '../data/complianceDeadlines.js';
import type { CountryCode } from '../data/plans.js';

export const nextDeadlinesSchema = {
  country: z
    .enum(['IN', 'US', 'CA', 'GB', 'AU', 'AE', 'SG', 'NZ'])
    .optional()
    .describe('Restrict to one country (ISO-2). Omit for every country.'),
  withinDays: z
    .number()
    .int()
    .min(1)
    .max(730)
    .optional()
    .describe('Only return filings whose next due date falls within this many days.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Max rows to return (default 25).'),
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Reference date (YYYY-MM-DD) to compute "next" from. Defaults to today (UTC).'),
};

export interface NextDeadlinesArgs {
  country?: CountryCode;
  withinDays?: number;
  limit?: number;
  asOf?: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
}

/** Parse "MMM D" into a 0-based month and day, or null if malformed. */
function parseAnnual(date: string): { month: number; day: number } | null {
  const m = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(date.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]);
  if (month < 0) return null;
  return { month, day: Number(m[2]) };
}

/**
 * Next concrete due date for a deadline on/after `today`, or null when the
 * schedule can't be placed unambiguously.
 */
export function computeNextDue(d: Deadline, today: Date): string | null {
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  // Explicit annual dates win — pick the earliest occurrence on/after today.
  if (d.annualDates && d.annualDates.length > 0) {
    let best: number | null = null;
    for (const raw of d.annualDates) {
      const parsed = parseAnnual(raw);
      if (!parsed) continue;
      for (const year of [today.getUTCFullYear(), today.getUTCFullYear() + 1]) {
        const day = Math.min(parsed.day, daysInMonth(year, parsed.month));
        const ts = Date.UTC(year, parsed.month, day);
        if (ts >= t && (best === null || ts < best)) best = ts;
      }
    }
    return best === null ? null : iso(new Date(best));
  }

  // Monthly recurring on a fixed day-of-month: this month if still ahead, else
  // next month (clamped to the month length).
  if (d.frequency === 'monthly' && typeof d.dueDay === 'number') {
    for (let ahead = 0; ahead <= 1; ahead++) {
      const year = today.getUTCFullYear();
      const monthIdx = today.getUTCMonth() + ahead;
      const y = year + Math.floor(monthIdx / 12);
      const m = ((monthIdx % 12) + 12) % 12;
      const day = Math.min(d.dueDay, daysInMonth(y, m));
      const ts = Date.UTC(y, m, day);
      if (ts >= t) return iso(new Date(ts));
    }
  }

  // Quarterly/half-yearly with only a dueDay (no month), or per-event: cannot
  // be placed to a specific date from static data.
  return null;
}

export interface NextDeadlineRow {
  id: string;
  country: CountryCode;
  form: string;
  authority: string;
  frequency: Deadline['frequency'];
  nextDue: string | null;
  daysUntil: number | null;
  scheduleVaries: boolean;
  applicabilityNote?: string;
  source: string;
  lastReviewed: string;
}

export interface NextDeadlinesResult {
  asOf: string;
  country: CountryCode | 'all';
  withinDays: number | null;
  count: number;
  deadlines: NextDeadlineRow[];
  disclaimer: string;
}

export function nextDeadlines(args: NextDeadlinesArgs): NextDeadlinesResult {
  const today = args.asOf ? new Date(`${args.asOf}T00:00:00Z`) : new Date();
  const todayTs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const limit = args.limit ?? 25;

  let rows: NextDeadlineRow[] = COMPLIANCE_DEADLINES
    .filter((d) => !args.country || d.country === args.country)
    .map((d) => {
      const nextDue = computeNextDue(d, today);
      const daysUntil =
        nextDue === null
          ? null
          : Math.round((new Date(`${nextDue}T00:00:00Z`).getTime() - todayTs) / 86_400_000);
      return {
        id: d.id,
        country: d.country,
        form: d.form,
        authority: d.authority,
        frequency: d.frequency,
        nextDue,
        daysUntil,
        scheduleVaries: nextDue === null,
        applicabilityNote: d.applicabilityNote,
        source: d.source,
        lastReviewed: d.lastReviewed,
      };
    });

  if (typeof args.withinDays === 'number') {
    const w = args.withinDays;
    rows = rows.filter((r) => r.daysUntil !== null && r.daysUntil <= w);
  }

  // Dated rows first, soonest due ascending; undated (scheduleVaries) after.
  rows.sort((a, b) => {
    if (a.daysUntil === null && b.daysUntil === null) return a.form.localeCompare(b.form);
    if (a.daysUntil === null) return 1;
    if (b.daysUntil === null) return -1;
    return a.daysUntil - b.daysUntil;
  });

  const limited = rows.slice(0, limit);
  return {
    asOf: iso(today),
    country: args.country ?? 'all',
    withinDays: args.withinDays ?? null,
    count: limited.length,
    deadlines: limited,
    disclaimer:
      'Statutory dates rotate annually and some filings vary by state/turnover. Confirm every date against each entry’s `source` URL before acting.',
  };
}
