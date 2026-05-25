/**
 * Field helpers shared by every public-MCP parser.
 *
 * Ported from `services/migrationImport/shared/fieldUtils.js` in
 * `Meru-Technosoft-Private-Limited/HelloBooks-Backend-Accounting-V3` so the
 * public MCP can parse competitor exports (QBO, Xero, Wave, Zoho) without
 * a cross-repo call. Pure functions only — no I/O, no Prisma, no logging.
 *
 * Identical normalisation semantics to the Node side: a row that parses
 * cleanly on Accounting-V3 must parse cleanly here too, and a row that
 * fails on Accounting-V3 must fail here with the same diagnosis. This is
 * verified by mirrored test fixtures.
 */

/** Trim and return null for empty / whitespace-only / undefined. */
export function trimOrNull(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/**
 * Parse a decimal field across competitor exports. Handles:
 *   "1500.00"        → 1500
 *   "1,500.00"       → 1500   (QBO US)
 *   "1.500,00"       → 1500   (European format)
 *   "(1,234.56)"     → -1234.56  (accounting parens for negative)
 *   "$1,500.00"      → 1500
 *   "₹1,500"         → 1500
 *   "-50"            → -50
 * Returns Number or null.
 */
export function parseDecimal(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  let s = String(v).trim();
  if (s === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replaceAll(/[$£€₹¥A-Za-z\s]/g, '');
  s = normalizeDecimalSeparators(s);

  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  // After stripping currency symbols and grouping marks, the string must
  // still contain at least one digit. `Number('')` coerces to 0 (Number is
  // not strict-parsey enough for this codepath), so guard explicitly.
  if (s === '' || !/\d/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function normalizeDecimalSeparators(s: string): string {
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) return s.replaceAll('.', '').replace(',', '.');
    return s.replaceAll(',', '');
  }
  if (lastComma === -1) return s;
  if (hasThousandsComma(s, lastComma)) return s.replaceAll(',', '');
  return s.replace(',', '.');
}

function hasThousandsComma(s: string, lastComma: number): boolean {
  return s.length - lastComma - 1 === 3;
}

export type DatePreference = 'auto' | 'mdy' | 'dmy';

export interface ParseDateOptions {
  prefer?: DatePreference;
}

/**
 * Parse a date across competitor export formats. Returns ISO YYYY-MM-DD or null.
 * Order matters — try unambiguous formats first, then fall through to MDY/DMY.
 *
 *   "2024-03-15"           → "2024-03-15"  (ISO)
 *   "03/15/2024"           → "2024-03-15"  (US — QBO default)
 *   "15/03/2024"           → "2024-03-15"  (UK/AU/IN — Xero default)
 *   "15-Mar-2024"          → "2024-03-15"  (Xero/FreshBooks fancy)
 *   "Mar 15, 2024"         → "2024-03-15"  (Wave default)
 */
export function parseFlexibleDate(v: unknown, opts: ParseDateOptions = {}): string | null {
  const s = trimOrNull(v);
  if (!s) return null;
  const prefer: DatePreference = opts.prefer ?? 'auto';

  return parseIsoDate(s)
    ?? parseDayMonthNameDate(s)
    ?? parseMonthNameDayDate(s)
    ?? parseNumericDate(s, prefer);
}

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

function parseIsoDate(s: string): string | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  return m ? safeIso(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

function parseDayMonthNameDate(s: string): string | null {
  const m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{4})$/.exec(s);
  if (!m) return null;
  const mon = monthIndex(m[2]);
  return mon === null ? null : safeIso(Number(m[3]), mon + 1, Number(m[1]));
}

function parseMonthNameDayDate(s: string): string | null {
  const m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (!m) return null;
  const mon = monthIndex(m[1]);
  return mon === null ? null : safeIso(Number(m[3]), mon + 1, Number(m[2]));
}

function parseNumericDate(s: string, prefer: DatePreference): string | null {
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  if (prefer === 'mdy') return safeIso(y, a, b);
  if (prefer === 'dmy') return safeIso(y, b, a);
  if (a > 12 && b <= 12) return safeIso(y, b, a);
  if (b > 12 && a <= 12) return safeIso(y, a, b);
  return safeIso(y, a, b);
}

function monthIndex(monthName: string): number | null {
  const mon = MONTHS.indexOf(monthName.slice(0, 3).toLowerCase());
  return mon === -1 ? null : mon;
}

function safeIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  // Day-of-month round-trip — guards against 31-Feb etc.
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** Lowercase plus collapse whitespace for fuzzy key building. */
export function fuzzyKey(s: unknown): string {
  return String(s ?? '').trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

/** Lowercase plus single-space collapse for header alias matching. */
export function normalizeHeader(s: unknown): string {
  return String(s ?? '').toLowerCase().trim().replaceAll(/\s+/g, ' ');
}
