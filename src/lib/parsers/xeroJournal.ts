/**
 * Xero Manual Journal parser — column-alias mapping and per-journal grouping.
 *
 * Ported from `services/migrationImport/importers/xero/journalEntry.importer.js`
 * in `Meru-Technosoft-Private-Limited/HelloBooks-Backend-Accounting-V3`. The
 * Node-side importer assumes Prisma context (`loadValidationContext` reads
 * the entity's Chart of Accounts and existing Journal Numbers); the public
 * MCP runs against pasted data only, so this port covers everything *except*
 * the CoA-validation step.
 *
 * Xero idiom differs from QBO in three meaningful ways:
 *   1. Manual journals are identified by REFERENCE if present, else by the
 *      combined `Narration||Date` header tuple. There is no QBO-style
 *      "Journal No." column.
 *   2. Account references use CODE (e.g. "200") rather than Name. Both can
 *      appear; Code is preferred when both are present.
 *   3. Xero's "Amount" column is signed:
 *        positive ⇒ Credit
 *        negative ⇒ Debit (absolute value)
 *      Explicit Debit/Credit columns are also accepted for compatibility
 *      with the alternative export shape.
 *
 * Canonical Xero Manual Journal export columns (Accounting > Advanced >
 * Manual Journals → Export):
 *   Narration | Date | Reference | AccountCode | Description | TaxType |
 *   Amount | TrackingName1 | TrackingOption1
 */

import { trimOrNull, parseDecimal, parseFlexibleDate, normalizeHeader } from './fieldUtils.js';

/* ──────────────────────── Column alias map ─────────────────────── */

/**
 * Canonical HelloBooks field → list of header aliases that map to it.
 * Ordered intentionally — `Narration` owns 'memo' / 'narration' so a Xero
 * line `Description` does not steal them. Lower-cased and whitespace-
 * collapsed before comparison via `normalizeHeader`.
 */
export const XERO_JOURNAL_COLUMN_ALIASES: Record<string, string[]> = {
  Narration:    ['narration', 'memo'],
  Date:         ['date', 'journal date'],
  Reference:    ['reference', 'journalnumber', 'journal number', 'journal no', 'num', '#'],
  AccountCode:  ['accountcode', 'account code', 'account'],
  AccountName:  ['account name'],
  LineDesc:     ['description', 'line description', 'desc'],
  TaxType:      ['taxtype', 'tax type'],
  Amount:       ['amount'],
  Debit:        ['debit', 'dr'],
  Credit:       ['credit', 'cr'],
  Currency:     ['currency'],
};

/* ──────────────────────── Public types ─────────────────────────── */

export type IssueCode =
  | 'MISSING_GROUP_KEY'
  | 'MISSING_DATE'
  | 'INVALID_DATE'
  | 'MISSING_ACCOUNT'
  | 'INVALID_DECIMAL'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'ZERO_AMOUNT'
  | 'NO_AMOUNT'
  | 'UNBALANCED_JOURNAL'
  | 'INCONSISTENT_DATE';

export interface ParseIssue {
  code: IssueCode;
  message: string;
  field?: string;
  /** 1-indexed row number in the source file, where row 1 is the first data row after the header. */
  rowIndex?: number;
}

export interface ParsedJournalLine {
  rowIndex: number;
  groupKey: string;
  narration: string | null;
  date: string | null;
  reference: string | null;
  accountCode: string | null;
  accountName: string | null;
  lineDesc: string | null;
  taxType: string | null;
  debit: number | null;
  credit: number | null;
  currency: string | null;
  issues: ParseIssue[];
}

export interface ParsedJournal {
  groupKey: string;
  reference: string | null;
  narration: string | null;
  date: string | null;
  lines: ParsedJournalLine[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
  issues: ParseIssue[];
}

export interface ParseInput {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ParseResult {
  source: 'XERO';
  entityType: 'JOURNAL_ENTRY';
  journals: ParsedJournal[];
  totalRows: number;
  totalJournals: number;
  totalIssues: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
}

/* ──────────────────── Column mapping helpers ───────────────────── */

export function buildColumnMapping(sourceColumns: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  const ALIASES = XERO_JOURNAL_COLUMN_ALIASES;
  for (const col of sourceColumns) {
    const norm = normalizeHeader(col);
    let matched: string | null = null;
    for (const [hbField, aliases] of Object.entries(ALIASES)) {
      if (aliases.some((a) => normalizeHeader(a) === norm)) {
        matched = hbField;
        break;
      }
    }
    mapping[col] = matched;
  }
  return mapping;
}

function applyMapping(
  rawRow: Record<string, unknown>,
  mapping: Record<string, string | null>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [srcCol, hbField] of Object.entries(mapping)) {
    if (!hbField) continue;
    const v = rawRow[srcCol];
    if (v === undefined || v === null || String(v).trim() === '') continue;
    out[hbField] = v;
  }
  return out;
}

/* ────────────────────── Group-key derivation ───────────────────── */

/**
 * Group key — Reference if present, else `narration||date`. Manual journals
 * in Xero are identified by either Reference (when set) or by the combined
 * Narration+Date (which Xero treats as the journal header). Returns null
 * when neither is available so the row can be flagged.
 */
function deriveGroupKey(mapped: Record<string, unknown>): string | null {
  const ref = trimOrNull(mapped.Reference);
  if (ref) return `R:${ref}`;
  const narration = trimOrNull(mapped.Narration);
  const date = trimOrNull(mapped.Date);
  if (!narration && !date) return null;
  return `N:${narration ?? ''}||${date ?? ''}`;
}

/* ───────────────────── Signed-amount parsing ───────────────────── */

interface DebitCredit {
  debit: number | null;
  credit: number | null;
  issues: ParseIssue[];
}

/**
 * Parse the Debit/Credit pair from a Xero manual-journal row. Two shapes
 * are supported (Xero exports vary by region / version):
 *   • Signed `Amount` column — positive ⇒ Credit, negative ⇒ Debit
 *   • Explicit `Debit` + `Credit` columns
 */
function parseDebitCredit(rowIndex: number, mapped: Record<string, unknown>): DebitCredit {
  const issues: ParseIssue[] = [];

  const debitRaw = mapped.Debit;
  const creditRaw = mapped.Credit;
  const debit = debitRaw !== undefined ? parseDecimal(debitRaw) : null;
  const credit = creditRaw !== undefined ? parseDecimal(creditRaw) : null;

  if (debitRaw !== undefined && debit === null) {
    issues.push({
      code: 'INVALID_DECIMAL',
      message: `Could not parse debit "${String(debitRaw)}"`,
      field: 'Debit',
      rowIndex,
    });
  }
  if (creditRaw !== undefined && credit === null) {
    issues.push({
      code: 'INVALID_DECIMAL',
      message: `Could not parse credit "${String(creditRaw)}"`,
      field: 'Credit',
      rowIndex,
    });
  }

  // Explicit columns take precedence when at least one parsed.
  if (debit !== null || credit !== null) {
    if (debit && credit) {
      issues.push({
        code: 'BOTH_DEBIT_AND_CREDIT',
        message: `Journal line has both debit (${debit}) and credit (${credit}) — only one is allowed per line.`,
        field: 'Debit',
        rowIndex,
      });
      return { debit: null, credit: null, issues };
    }
    return { debit: debit ?? null, credit: credit ?? null, issues };
  }

  // Fall back to signed Amount column.
  const amountRaw = mapped.Amount;
  if (amountRaw === undefined) {
    issues.push({
      code: 'NO_AMOUNT',
      message: 'Journal line has neither an Amount nor a Debit/Credit value.',
      field: 'Amount',
      rowIndex,
    });
    return { debit: null, credit: null, issues };
  }

  const signed = parseDecimal(amountRaw);
  if (signed === null) {
    issues.push({
      code: 'INVALID_DECIMAL',
      message: `Could not parse amount "${String(amountRaw)}"`,
      field: 'Amount',
      rowIndex,
    });
    return { debit: null, credit: null, issues };
  }
  if (signed === 0) {
    issues.push({
      code: 'ZERO_AMOUNT',
      message: 'Journal line amount is zero.',
      field: 'Amount',
      rowIndex,
    });
    return { debit: null, credit: null, issues };
  }
  if (signed > 0) {
    return { debit: null, credit: signed, issues };
  }
  return { debit: -signed, credit: null, issues };
}

/* ───────────────────── Per-row validation ──────────────────────── */

function validateAndShapeLine(
  rowIndex: number,
  mapped: Record<string, unknown>,
): ParsedJournalLine {
  const issues: ParseIssue[] = [];
  const gk = deriveGroupKey(mapped);
  if (!gk) {
    issues.push({
      code: 'MISSING_GROUP_KEY',
      message: 'Journal entry row needs a Reference or a Narration+Date pair.',
      field: 'Reference',
      rowIndex,
    });
  }

  const dateRaw = trimOrNull(mapped.Date);
  const date = dateRaw ? parseFlexibleDate(dateRaw, { prefer: 'dmy' }) : null;
  if (dateRaw && !date) {
    issues.push({
      code: 'INVALID_DATE',
      message: `Could not parse journal date "${dateRaw}"`,
      field: 'Date',
      rowIndex,
    });
  }

  const accountCode = trimOrNull(mapped.AccountCode);
  const accountName = trimOrNull(mapped.AccountName);
  if (!accountCode && !accountName) {
    issues.push({
      code: 'MISSING_ACCOUNT',
      message: 'Journal line needs an Account (code or name).',
      field: 'AccountCode',
      rowIndex,
    });
  }

  const { debit, credit, issues: amountIssues } = parseDebitCredit(rowIndex, mapped);

  return {
    rowIndex,
    groupKey: gk ?? '',
    narration: trimOrNull(mapped.Narration),
    date,
    reference: trimOrNull(mapped.Reference),
    accountCode,
    accountName,
    lineDesc: trimOrNull(mapped.LineDesc),
    taxType: trimOrNull(mapped.TaxType),
    debit,
    credit,
    currency: trimOrNull(mapped.Currency),
    issues: [...issues, ...amountIssues],
  };
}

/* ──────────────────── Per-journal grouping ─────────────────────── */

const PENNY = 0.01;

function groupJournals(lines: ParsedJournalLine[]): ParsedJournal[] {
  const order: string[] = [];
  const byKey = new Map<string, ParsedJournalLine[]>();

  for (const line of lines) {
    if (!line.groupKey) continue; // flagged as MISSING_GROUP_KEY
    if (!byKey.has(line.groupKey)) {
      order.push(line.groupKey);
      byKey.set(line.groupKey, []);
    }
    byKey.get(line.groupKey)!.push(line);
  }

  const journals: ParsedJournal[] = [];
  for (const groupKey of order) {
    const journalLines = byKey.get(groupKey)!;
    const journalIssues: ParseIssue[] = [];

    const dateSet = new Set(journalLines.map((l) => l.date).filter((d): d is string => d !== null));
    if (dateSet.size > 1) {
      journalIssues.push({
        code: 'INCONSISTENT_DATE',
        message: `Journal "${prettyKey(groupKey)}" has rows with conflicting dates: ${[...dateSet].sort().join(', ')}`,
        field: 'Date',
      });
    }
    const date = journalLines.find((l) => l.date)?.date ?? null;

    const totalDebits = journalLines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredits = journalLines.reduce((s, l) => s + (l.credit ?? 0), 0);
    const balanced = Math.abs(totalDebits - totalCredits) < PENNY;
    if (!balanced) {
      journalIssues.push({
        code: 'UNBALANCED_JOURNAL',
        message: `Journal "${prettyKey(groupKey)}" is unbalanced: debits ${totalDebits.toFixed(2)} vs credits ${totalCredits.toFixed(2)} (diff ${(totalDebits - totalCredits).toFixed(2)})`,
        field: 'Debit',
      });
    }

    journals.push({
      groupKey,
      reference: journalLines.find((l) => l.reference)?.reference ?? null,
      narration: journalLines.find((l) => l.narration)?.narration ?? null,
      date,
      lines: journalLines,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      balanced,
      issues: journalIssues,
    });
  }
  return journals;
}

function prettyKey(groupKey: string): string {
  // "R:REF-001" → "REF-001"
  // "N:Narration||2024-04-01" → "Narration on 2024-04-01"
  if (groupKey.startsWith('R:')) return groupKey.slice(2);
  if (groupKey.startsWith('N:')) {
    const rest = groupKey.slice(2);
    const idx = rest.indexOf('||');
    if (idx === -1) return rest;
    const narration = rest.slice(0, idx);
    const date = rest.slice(idx + 2);
    if (narration && date) return `${narration} on ${date}`;
    return narration || date;
  }
  return groupKey;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ─────────────────────────── Public API ────────────────────────── */

/**
 * Parse + group + validate a Xero Manual Journals export.
 *
 * Caller responsibilities:
 *   - Provide parsed-CSV-style input: `{columns, rows}` where `columns` is
 *     the header row and `rows` is one object per data row keyed by header.
 *   - Strip BOM, skip Xero's leading banner rows + "Read me" sheets before
 *     calling.
 *
 * The result includes:
 *   - `journals` — grouped by Reference or by Narration+Date, with line-
 *     level + journal-level issues.
 *   - `columnMapping` — diagnostic for header drift.
 *   - `unmappedColumns` — headers ignored.
 *   - `totalIssues` — count across all journals + lines.
 */
export function parseXeroJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const unmappedColumns = Object.entries(mapping)
    .filter(([, hb]) => hb === null)
    .map(([col]) => col);

  const lines: ParsedJournalLine[] = [];
  input.rows.forEach((raw, idx) => {
    const hasAny = Object.values(raw).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasAny) return;

    const mapped = applyMapping(raw, mapping);
    const line = validateAndShapeLine(idx + 1, mapped);
    lines.push(line);
  });

  const journals = groupJournals(lines);

  let totalIssues = 0;
  for (const j of journals) totalIssues += j.issues.length;
  for (const l of lines) totalIssues += l.issues.length;

  return {
    source: 'XERO',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues,
    columnMapping: mapping,
    unmappedColumns,
  };
}
