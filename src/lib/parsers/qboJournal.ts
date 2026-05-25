/**
 * QBO Journal Entries parser — column-alias mapping and per-journal grouping.
 *
 * Ported from `services/migrationImport/importers/qbo/journalEntry.importer.js`
 * in `Meru-Technosoft-Private-Limited/HelloBooks-Backend-Accounting-V3`. The
 * Node-side importer assumes Prisma context (`loadValidationContext` reads
 * the entity's Chart of Accounts and existing Journal Numbers); the public
 * MCP runs against pasted data only, so this port covers everything *except*
 * the CoA-validation step. Specifically:
 *
 *   ✅ Column alias detection (header normalisation + COLUMN_ALIASES map)
 *   ✅ Per-row schema validation (debit XOR credit, parseable date, parseable amount)
 *   ✅ Per-journal grouping by JournalNumber
 *   ✅ Per-journal balance check (sum debits === sum credits)
 *   ❌ UNKNOWN_ACCOUNT check (requires entity CoA — paid path only)
 *   ❌ ALREADY_EXISTS check (requires entity Journal table — paid path only)
 *
 * Input shape is `{columns: string[], rows: Record<string, unknown>[]}` —
 * caller is responsible for CSV/XLSX parsing (papaparse / xlsx are added in
 * a separate PR so this file stays dependency-free).
 *
 * QBO export columns (Reports > Accountant > Journal):
 *   Date | Num | Account | Debit | Credit | Memo | Name | Class
 */

import { trimOrNull, parseFlexibleDate } from './fieldUtils.js';
import {
  applyColumnMapping,
  buildAliasColumnMapping,
  parseJournalDebitCredit,
  PENNY,
  round2,
  rowHasValues,
  sortedStrings,
  type ColumnMapping,
} from './journalUtils.js';

/* ──────────────────────── Column alias map ─────────────────────── */

/**
 * Canonical HelloBooks field → list of header aliases that map to it.
 * Lower-cased and whitespace-collapsed before comparison via `normalizeHeader`.
 */
export const QBO_JOURNAL_COLUMN_ALIASES: Record<string, string[]> = {
  Date:           ['date', 'journal date', 'txn date'],
  JournalNumber:  ['num', 'no.', 'journal no', 'journal number', 'je no', 'je #', '#'],
  AccountName:    ['account', 'account name'],
  Debit:          ['debit', 'dr', 'debit amount'],
  Credit:         ['credit', 'cr', 'credit amount'],
  Memo:           ['memo', 'description', 'narration', 'note'],
  Name:           ['name', 'customer', 'vendor', 'payee'],
  Class:          ['class'],
  Currency:       ['currency'],
};

/* ──────────────────────── Public types ─────────────────────────── */

export type IssueCode =
  | 'MISSING_JOURNAL_NUMBER'
  | 'MISSING_DATE'
  | 'INVALID_DATE'
  | 'MISSING_ACCOUNT'
  | 'INVALID_DECIMAL'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'NEITHER_DEBIT_NOR_CREDIT'
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
  journalNumber: string;
  date: string | null;
  accountName: string | null;
  debit: number | null;
  credit: number | null;
  memo: string | null;
  name: string | null;
  class: string | null;
  currency: string | null;
  issues: ParseIssue[];
}

export interface ParsedJournal {
  journalNumber: string;
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
  source: 'QBO';
  entityType: 'JOURNAL_ENTRY';
  journals: ParsedJournal[];
  totalRows: number;
  totalJournals: number;
  totalIssues: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
}

/* ──────────────────── Column mapping helpers ───────────────────── */

/**
 * Build a {sourceColumn → canonicalField} mapping from a CSV header row.
 * Unrecognised columns map to null and surface as `unmappedColumns` in the
 * result — useful for diagnosing custom QBO exports.
 */
export function buildColumnMapping(sourceColumns: string[]): ColumnMapping {
  return buildAliasColumnMapping(sourceColumns, QBO_JOURNAL_COLUMN_ALIASES);
}

/* ───────────────────── Per-row validation ──────────────────────── */

function validateAndShapeLine(
  rowIndex: number,
  mapped: Record<string, unknown>,
): ParsedJournalLine {
  const issues: ParseIssue[] = [];

  const journalNumber = trimOrNull(mapped.JournalNumber) ?? '';
  if (!journalNumber) {
    issues.push({
      code: 'MISSING_JOURNAL_NUMBER',
      message: 'Journal entry row needs a Journal No.',
      field: 'JournalNumber',
      rowIndex,
    });
  }

  const dateRaw = trimOrNull(mapped.Date);
  const date = dateRaw ? parseFlexibleDate(dateRaw, { prefer: 'mdy' }) : null;
  if (dateRaw && !date) {
    issues.push({
      code: 'INVALID_DATE',
      message: `Could not parse journal date "${dateRaw}"`,
      field: 'Date',
      rowIndex,
    });
  }

  const accountName = trimOrNull(mapped.AccountName);
  if (!accountName) {
    issues.push({
      code: 'MISSING_ACCOUNT',
      message: 'Journal line needs an Account.',
      field: 'AccountName',
      rowIndex,
    });
  }

  const { debit, credit, issues: amountIssues } = parseJournalDebitCredit(rowIndex, mapped);
  issues.push(...amountIssues);

  return {
    rowIndex,
    journalNumber,
    date,
    accountName,
    debit,
    credit,
    memo: trimOrNull(mapped.Memo),
    name: trimOrNull(mapped.Name),
    class: trimOrNull(mapped.Class),
    currency: trimOrNull(mapped.Currency),
    issues,
  };
}

/* ──────────────────── Per-journal grouping ─────────────────────── */

function groupJournals(lines: ParsedJournalLine[]): ParsedJournal[] {
  // Preserve first-seen ordering of journal numbers — important for back-
  // referencing rowIndex in user-facing output.
  const order: string[] = [];
  const byNumber = new Map<string, ParsedJournalLine[]>();

  for (const line of lines) {
    if (!line.journalNumber) continue; // already flagged as MISSING_JOURNAL_NUMBER
    if (!byNumber.has(line.journalNumber)) {
      order.push(line.journalNumber);
      byNumber.set(line.journalNumber, []);
    }
    byNumber.get(line.journalNumber)!.push(line);
  }

  const journals: ParsedJournal[] = [];
  for (const journalNumber of order) {
    const journalLines = byNumber.get(journalNumber)!;
    const journalIssues: ParseIssue[] = [];

    // Date consistency — QBO exports the same date on every line of a
    // journal. If they differ, flag once and use the first non-null date
    // as the canonical value.
    const dateSet = new Set(journalLines.map((l) => l.date).filter((d): d is string => d !== null));
    if (dateSet.size > 1) {
      journalIssues.push({
        code: 'INCONSISTENT_DATE',
        message: `Journal "${journalNumber}" has rows with conflicting dates: ${sortedStrings(dateSet).join(', ')}`,
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
        message: `Journal "${journalNumber}" is unbalanced: debits ${totalDebits.toFixed(2)} vs credits ${totalCredits.toFixed(2)} (diff ${(totalDebits - totalCredits).toFixed(2)})`,
        field: 'Debit',
      });
    }

    journals.push({
      journalNumber,
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

/* ─────────────────────────── Public API ────────────────────────── */

/**
 * Parse + group + validate a QBO Journal Entries export.
 *
 * Caller responsibilities:
 *   - Provide parsed-CSV-style input: `{columns, rows}` where `columns` is
 *     the header row and `rows` is one object per data row keyed by header.
 *   - Strip BOM and skip "Read me" / "Instructions" sheets before calling.
 *
 * The result includes:
 *   - `journals` — grouped, balanced, with line-level + journal-level issues.
 *   - `columnMapping` — diagnostic for header drift.
 *   - `unmappedColumns` — headers we ignored.
 *   - `totalIssues` — count across all journals + lines.
 */
export function parseQboJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const unmappedColumns = Object.entries(mapping)
    .filter(([, hb]) => hb === null)
    .map(([col]) => col);

  const lines: ParsedJournalLine[] = [];
  input.rows.forEach((raw, idx) => {
    // Skip wholly empty rows (papaparse skipEmptyLines does most of this,
    // but XLSX can still emit `{Date: '', Num: '', ...}` blanks).
    if (!rowHasValues(raw)) return;

    const mapped = applyColumnMapping(raw, mapping);
    const line = validateAndShapeLine(idx + 1, mapped);
    lines.push(line);
  });

  const journals = groupJournals(lines);

  let totalIssues = 0;
  for (const j of journals) totalIssues += j.issues.length;
  for (const l of lines) totalIssues += l.issues.length;

  return {
    source: 'QBO',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues,
    columnMapping: mapping,
    unmappedColumns,
  };
}
