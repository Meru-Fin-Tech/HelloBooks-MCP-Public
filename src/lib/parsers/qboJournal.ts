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

import { trimOrNull, parseFlexibleDate, scalarToString } from './fieldUtils.js';
import {
  buildAliasColumnMapping,
  countJournalIssues,
  groupJournalLines,
  parseExplicitDebitCredit,
  parseMappedRows,
  round2,
  unmappedColumns,
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
export function buildColumnMapping(sourceColumns: string[]): Record<string, string | null> {
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

  const { debit, credit, issues: amountIssues } = parseExplicitDebitCredit(rowIndex, mapped, {
    invalidDebit: (debitRaw) => `Could not parse debit "${scalarToString(debitRaw)}"`,
    invalidCredit: (creditRaw) => `Could not parse credit "${scalarToString(creditRaw)}"`,
    both: (debit, credit) => `Journal line has both debit (${debit}) and credit (${credit}) — only one is allowed per line.`,
    neither: 'Journal line has neither a debit nor a credit amount.',
  });

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
    issues: [...issues, ...(amountIssues as ParseIssue[])],
  };
}

/* ──────────────────── Per-journal grouping ─────────────────────── */

function groupJournals(lines: ParsedJournalLine[]): ParsedJournal[] {
  return groupJournalLines({
    lines,
    getKey: (line) => line.journalNumber,
    describe: (journalNumber) => journalNumber,
    includeUnbalancedIssue: true,
    makeJournal: ({ key, date, lines, totalDebits, totalCredits, balanced, issues }) => ({
      journalNumber: key,
      date,
      lines,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      balanced,
      issues: issues as ParseIssue[],
    }),
  });
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
  const lines = parseMappedRows(input, mapping, validateAndShapeLine);

  const journals = groupJournals(lines);

  return {
    source: 'QBO',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues: countJournalIssues(journals, lines),
    columnMapping: mapping,
    unmappedColumns: unmappedColumns(mapping),
  };
}
