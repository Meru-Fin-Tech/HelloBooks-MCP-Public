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

import { trimOrNull, parseDecimal, parseFlexibleDate, normalizeHeader } from './fieldUtils.js';

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
  const mapping: Record<string, string | null> = {};
  for (const col of sourceColumns) {
    const norm = normalizeHeader(col);
    let matched: string | null = null;
    for (const [hbField, aliases] of Object.entries(ZOHO_JOURNAL_COLUMN_ALIASES)) {
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

  const debitRaw = mapped.Debit;
  const creditRaw = mapped.Credit;
  const debit = debitRaw !== undefined ? parseDecimal(debitRaw) : null;
  const credit = creditRaw !== undefined ? parseDecimal(creditRaw) : null;
  if (debitRaw !== undefined && debit === null) {
    issues.push({ code: 'INVALID_DECIMAL', message: `Could not parse debit "${String(debitRaw)}"`, field: 'Debit', rowIndex });
  }
  if (creditRaw !== undefined && credit === null) {
    issues.push({ code: 'INVALID_DECIMAL', message: `Could not parse credit "${String(creditRaw)}"`, field: 'Credit', rowIndex });
  }

  const debitParsed = debitRaw === undefined || debit !== null;
  const creditParsed = creditRaw === undefined || credit !== null;
  if (debitParsed && creditParsed) {
    if (debit && credit) {
      issues.push({ code: 'BOTH_DEBIT_AND_CREDIT', message: `Journal line has both debit (${debit}) and credit (${credit}) — only one is allowed per line.`, field: 'Debit', rowIndex });
    } else if (!debit && !credit) {
      issues.push({ code: 'NEITHER_DEBIT_NOR_CREDIT', message: 'Journal line has neither a debit nor a credit amount.', field: 'Debit', rowIndex });
    }
  }

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
    issues,
  };
}

const PENNY = 0.01;

function groupJournals(lines: ParsedJournalLine[]): ParsedJournal[] {
  const order: string[] = [];
  const byNumber = new Map<string, ParsedJournalLine[]>();
  for (const line of lines) {
    if (!line.journalNumber) continue;
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

    const dateSet = new Set(journalLines.map((l) => l.date).filter((d): d is string => d !== null));
    if (dateSet.size > 1) {
      journalIssues.push({ code: 'INCONSISTENT_DATE', message: `Journal "${journalNumber}" has rows with conflicting dates: ${[...dateSet].sort().join(', ')}`, field: 'Date' });
    }
    const date = journalLines.find((l) => l.date)?.date ?? null;

    const totalDebits = journalLines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredits = journalLines.reduce((s, l) => s + (l.credit ?? 0), 0);
    const balanced = Math.abs(totalDebits - totalCredits) < PENNY;

    journals.push({
      journalNumber,
      date,
      reference: journalLines.find((l) => l.reference)?.reference ?? null,
      notes: journalLines.find((l) => l.notes)?.notes ?? null,
      lines: journalLines,
      totalDebits: round2(totalDebits),
      totalCredits: round2(totalCredits),
      balanced,
      issues: journalIssues,
    });
  }
  return journals;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseZohoJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const unmappedColumns = Object.entries(mapping)
    .filter(([, hb]) => hb === null)
    .map(([col]) => col);

  const lines: ParsedJournalLine[] = [];
  input.rows.forEach((raw, idx) => {
    const hasAny = Object.values(raw).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasAny) return;
    const mapped = applyMapping(raw, mapping);
    lines.push(validateAndShapeLine(idx + 1, mapped));
  });

  const journals = groupJournals(lines);

  let totalIssues = 0;
  for (const j of journals) totalIssues += j.issues.length;
  for (const l of lines) totalIssues += l.issues.length;

  return {
    source: 'ZOHO',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues,
    columnMapping: mapping,
    unmappedColumns,
  };
}
