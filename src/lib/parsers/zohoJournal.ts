/**
 * Zoho Books Journal Entries parser.
 *
 * Ported from `services/migrationImport/importers/zoho/journalEntry.importer.js`
 * in Accounting-V3. Zoho uses an explicit Debit/Credit shape (no signed-
 * Amount column) and groups by `Journal Number` — closer to QBO than to
 * Xero. The interesting columns Zoho ships that QBO does not:
 *   • Reference Number — separate from Journal Number
 *   • Status — Draft / Posted (Zoho exposes this in exports)
 *   • Contact — customer / vendor name on the line
 *   • Branch — Zoho's class-equivalent
 *   • Currency Code + Exchange Rate — multi-currency entries
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

export const ZOHO_JOURNAL_COLUMN_ALIASES: Record<string, string[]> = {
  Date:           ['journal date', 'date'],
  JournalNumber:  ['journal number', 'journal no', 'journal no.', '#'],
  Reference:      ['reference number', 'reference'],
  Notes:          ['notes', 'narration'],
  AccountName:    ['account', 'account name'],
  LineDesc:       ['description', 'line description'],
  Debit:          ['debit', 'dr', 'debit amount'],
  Credit:         ['credit', 'cr', 'credit amount'],
  Contact:        ['contact', 'name'],
  Currency:       ['currency', 'currency code'],
  Status:         ['status'],
};

export type IssueCode =
  | 'MISSING_JOURNAL_NUMBER'
  | 'MISSING_DATE'
  | 'INVALID_DATE'
  | 'MISSING_ACCOUNT'
  | 'INVALID_DECIMAL'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'NEITHER_DEBIT_NOR_CREDIT'
  | 'INCONSISTENT_DATE';

export interface ParseIssue {
  code: IssueCode;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface ParsedJournalLine {
  rowIndex: number;
  journalNumber: string;
  date: string | null;
  reference: string | null;
  notes: string | null;
  accountName: string | null;
  lineDesc: string | null;
  debit: number | null;
  credit: number | null;
  contact: string | null;
  currency: string | null;
  status: string | null;
  issues: ParseIssue[];
}

export interface ParsedJournal {
  journalNumber: string;
  date: string | null;
  reference: string | null;
  notes: string | null;
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
  source: 'ZOHO';
  entityType: 'JOURNAL_ENTRY';
  journals: ParsedJournal[];
  totalRows: number;
  totalJournals: number;
  totalIssues: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
}

export function buildColumnMapping(sourceColumns: string[]): Record<string, string | null> {
  return buildAliasColumnMapping(sourceColumns, ZOHO_JOURNAL_COLUMN_ALIASES);
}

function validateAndShapeLine(rowIndex: number, mapped: Record<string, unknown>): ParsedJournalLine {
  const issues: ParseIssue[] = [];

  const journalNumber = trimOrNull(mapped.JournalNumber) ?? '';
  if (!journalNumber) {
    issues.push({ code: 'MISSING_JOURNAL_NUMBER', message: 'Journal entry row needs a Journal Number.', field: 'JournalNumber', rowIndex });
  }

  const dateRaw = trimOrNull(mapped.Date);
  // Zoho exports historically default to DD/MM/YYYY in India + UK, MM/DD/YYYY in US.
  // Use auto-detect (the parser falls back to MDY on ambiguous slashes; day-out-of-range
  // values flip to DMY automatically).
  const date = dateRaw ? parseFlexibleDate(dateRaw) : null;
  if (dateRaw && !date) {
    issues.push({ code: 'INVALID_DATE', message: `Could not parse journal date "${dateRaw}"`, field: 'Date', rowIndex });
  }

  const accountName = trimOrNull(mapped.AccountName);
  if (!accountName) {
    issues.push({ code: 'MISSING_ACCOUNT', message: 'Journal line needs an Account.', field: 'AccountName', rowIndex });
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
    reference: trimOrNull(mapped.Reference),
    notes: trimOrNull(mapped.Notes),
    accountName,
    lineDesc: trimOrNull(mapped.LineDesc),
    debit,
    credit,
    contact: trimOrNull(mapped.Contact),
    currency: trimOrNull(mapped.Currency),
    status: trimOrNull(mapped.Status),
    issues: [...issues, ...(amountIssues as ParseIssue[])],
  };
}

function groupJournals(lines: ParsedJournalLine[]): ParsedJournal[] {
  return groupJournalLines({
    lines,
    getKey: (line) => line.journalNumber,
    describe: (journalNumber) => journalNumber,
    makeJournal: ({ key, date, lines, totalDebits, totalCredits, balanced, issues }) => ({
      journalNumber: key,
      date,
      reference: lines.find((l) => l.reference)?.reference ?? null,
      notes: lines.find((l) => l.notes)?.notes ?? null,
      lines,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      balanced,
      issues: issues as ParseIssue[],
    }),
  });
}

export function parseZohoJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const lines = parseMappedRows(input, mapping, validateAndShapeLine);
  const journals = groupJournals(lines);

  return {
    source: 'ZOHO',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues: countJournalIssues(journals, lines),
    columnMapping: mapping,
    unmappedColumns: unmappedColumns(mapping),
  };
}
