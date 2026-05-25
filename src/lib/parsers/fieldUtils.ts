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
  const s = scalarToString(v).trim();
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
  let s = scalarToString(v).trim();
  if (s === '') return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1).trim();
  }
  s = s.replaceAll(/[$£€₹¥A-Za-z\s]/g, '');

  // Decimal-vs-thousands separator disambiguation. Two scenarios:
  //   1) Both `,` and `.` present — the one appearing LAST is the decimal
  //      separator. "1,500.00" → US (dot is decimal). "1.500,00" → European.
  //   2) Only `,` present — ambiguous. "1,500" could be US thousands or
  //      European decimal. Disambiguate by digit-count after the comma:
  //      exactly 3 → thousands separator; otherwise → decimal separator.
  //      ("1,50" → 1.5; "1,500" → 1500; "1,500,000" → 1500000.)
  //   3) Only `.` present — dot is the decimal separator (already in the
  //      target format). Note: "1.500" stays 1.5 — this matches the QBO
  //      US export convention, where multi-thousand values always carry a
  //      comma. A misread here on truly European input is acceptable
  //      because QBO US is the dominant source.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replaceAll('.', '').replace(',', '.');
    } else {
      s = s.replaceAll(',', '');
    }
  } else if (lastComma !== -1) {
    const digitsAfterComma = s.length - lastComma - 1;
    if (digitsAfterComma === 3) {
      s = s.replaceAll(',', '');
    } else {
      s = s.replace(',', '.');
    }
  }

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

  // ISO YYYY-MM-DD
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    return safeIso(Number(m[1]), Number(m[2]), Number(m[3]));
  }

  // "15-Mar-2024" / "15 Mar 2024"
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s,-]+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mon !== -1) return safeIso(Number(m[3]), mon + 1, Number(m[1]));
  }

  // "Mar 15 2024" / "Mar 15, 2024"
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) {
    const mon = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    if (mon !== -1) return safeIso(Number(m[3]), mon + 1, Number(m[2]));
  }

  // Slash / dash numeric: "03/15/2024" or "15/03/2024"
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (m) {
    return parseNumericDate(m, prefer);
  }

  return null;
}

const MONTHS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
];

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
  return scalarToString(s).trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

/** Lowercase plus single-space collapse for header alias matching. */
export function normalizeHeader(s: unknown): string {
  return scalarToString(s).toLowerCase().trim().replaceAll(/\s+/g, ' ');
}

export function scalarToString(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  if (v instanceof Date) return v.toISOString();
  return '';
}

function parseNumericDate(m: RegExpExecArray, prefer: DatePreference): string | null {
  const a = Number(m[1]);
  const b = Number(m[2]);
  const y = Number(m[3]);
  if (prefer === 'mdy') return safeIso(y, a, b);
  if (prefer === 'dmy') return safeIso(y, b, a);
  // Auto — if first part > 12 it must be the day.
  if (a > 12 && b <= 12) return safeIso(y, b, a);
  if (b > 12 && a <= 12) return safeIso(y, a, b);
  // Tie-breaker — default to US-style because QBO is the dominant source.
  return safeIso(y, a, b);
}
