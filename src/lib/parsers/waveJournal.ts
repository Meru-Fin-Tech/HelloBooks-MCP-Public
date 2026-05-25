/**
 * Wave Journal Transactions parser.
 *
 * Ported from `services/migrationImport/importers/wave/journalEntry.importer.js`
 * in Accounting-V3. Wave's export schema is minimal:
 *   Date | Transaction ID | Account | Description | Debit | Credit | Notes
 *
 * Grouped by Transaction ID (Wave's equivalent of journal-number). Same
 * explicit Debit/Credit shape as QBO/Zoho; no signed-amount handling.
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

export const WAVE_JOURNAL_COLUMN_ALIASES: Record<string, string[]> = {
  Date:           ['date', 'transaction date'],
  JournalNumber:  ['transaction id', 'journal number', 'journal no', '#'],
  Reference:      ['reference', 'reference number'],
  Notes:          ['notes', 'narration'],
  AccountName:    ['account', 'account name'],
  LineDesc:       ['description', 'memo'],
  Debit:          ['debit', 'dr', 'debit amount'],
  Credit:         ['credit', 'cr', 'credit amount'],
  Contact:        ['customer', 'vendor', 'name'],
  Currency:       ['currency'],
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
  source: 'WAVE';
  entityType: 'JOURNAL_ENTRY';
  journals: ParsedJournal[];
  totalRows: number;
  totalJournals: number;
  totalIssues: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
}

export function buildColumnMapping(sourceColumns: string[]): Record<string, string | null> {
  return buildAliasColumnMapping(sourceColumns, WAVE_JOURNAL_COLUMN_ALIASES);
}

function validateAndShapeLine(rowIndex: number, mapped: Record<string, unknown>): ParsedJournalLine {
  const issues: ParseIssue[] = [];

  const journalNumber = trimOrNull(mapped.JournalNumber) ?? '';
  if (!journalNumber) {
    issues.push({ code: 'MISSING_JOURNAL_NUMBER', message: 'Journal entry row needs a Transaction ID.', field: 'JournalNumber', rowIndex });
  }

  const dateRaw = trimOrNull(mapped.Date);
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

export function parseWaveJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const lines = parseMappedRows(input, mapping, validateAndShapeLine);
  const journals = groupJournals(lines);

  return {
    source: 'WAVE',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues: countJournalIssues(journals, lines),
    columnMapping: mapping,
    unmappedColumns: unmappedColumns(mapping),
  };
}
