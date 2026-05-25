import { normalizeHeader, parseDecimal, parseFlexibleDate, trimOrNull } from './fieldUtils.js';

export type ColumnMapping = Record<string, string | null>;

export interface JournalParseIssue<Code extends string = string> {
  code: Code;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface DebitCreditResult {
  debit: number | null;
  credit: number | null;
  debitRaw: unknown;
  creditRaw: unknown;
  issues: JournalParseIssue<'INVALID_DECIMAL' | 'BOTH_DEBIT_AND_CREDIT' | 'NEITHER_DEBIT_NOR_CREDIT'>[];
}

export const PENNY = 0.01;

export type ExplicitJournalIssueCode =
  | 'MISSING_JOURNAL_NUMBER'
  | 'MISSING_DATE'
  | 'INVALID_DATE'
  | 'MISSING_ACCOUNT'
  | 'INVALID_DECIMAL'
  | 'BOTH_DEBIT_AND_CREDIT'
  | 'NEITHER_DEBIT_NOR_CREDIT'
  | 'INCONSISTENT_DATE';

export type ExplicitJournalParseIssue = JournalParseIssue<ExplicitJournalIssueCode>;

export interface ExplicitJournalLineBase {
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
  issues: ExplicitJournalParseIssue[];
}

export interface ExplicitParsedJournal<Line extends ExplicitJournalLineBase> {
  journalNumber: string;
  date: string | null;
  reference: string | null;
  notes: string | null;
  lines: Line[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
  issues: ExplicitJournalParseIssue[];
}

export interface JournalParseInput {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ExplicitJournalParseResult<
  Source extends string,
  Line extends ExplicitJournalLineBase,
> {
  source: Source;
  entityType: 'JOURNAL_ENTRY';
  journals: ExplicitParsedJournal<Line>[];
  totalRows: number;
  totalJournals: number;
  totalIssues: number;
  columnMapping: ColumnMapping;
  unmappedColumns: string[];
}

export interface ExplicitLineOptions {
  missingJournalMessage: string;
}

export function buildAliasColumnMapping(
  sourceColumns: string[],
  aliasesByField: Record<string, string[]>,
): ColumnMapping {
  const normalizedAliases = Object.entries(aliasesByField).map(([field, aliases]) => ({
    field,
    aliases: new Set(aliases.map(normalizeHeader)),
  }));

  const mapping: ColumnMapping = {};
  for (const col of sourceColumns) {
    const norm = normalizeHeader(col);
    const match = normalizedAliases.find(({ aliases }) => aliases.has(norm));
    mapping[col] = match?.field ?? null;
  }
  return mapping;
}

export function applyColumnMapping(
  rawRow: Record<string, unknown>,
  mapping: ColumnMapping,
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

export function rowHasValues(raw: Record<string, unknown>): boolean {
  return Object.values(raw).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
}

export function sortedStrings(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function groupExplicitJournals<Line extends ExplicitJournalLineBase>(
  lines: Line[],
): ExplicitParsedJournal<Line>[] {
  const order: string[] = [];
  const byNumber = new Map<string, Line[]>();
  for (const line of lines) {
    if (!line.journalNumber) continue;
    if (!byNumber.has(line.journalNumber)) {
      order.push(line.journalNumber);
      byNumber.set(line.journalNumber, []);
    }
    byNumber.get(line.journalNumber)!.push(line);
  }

  return order.map((journalNumber) => {
    const journalLines = byNumber.get(journalNumber)!;
    return buildExplicitJournal(journalNumber, journalLines);
  });
}

function buildExplicitJournal<Line extends ExplicitJournalLineBase>(
  journalNumber: string,
  journalLines: Line[],
): ExplicitParsedJournal<Line> {
  const totalDebits = journalLines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const totalCredits = journalLines.reduce((s, l) => s + (l.credit ?? 0), 0);

  return {
    journalNumber,
    date: firstPresent(journalLines, (line) => line.date),
    reference: firstPresent(journalLines, (line) => line.reference),
    notes: firstPresent(journalLines, (line) => line.notes),
    lines: journalLines,
    totalDebits: round2(totalDebits),
    totalCredits: round2(totalCredits),
    balanced: Math.abs(totalDebits - totalCredits) < PENNY,
    issues: dateConsistencyIssues(journalNumber, journalLines),
  };
}

function dateConsistencyIssues<Line extends ExplicitJournalLineBase>(
  journalNumber: string,
  journalLines: Line[],
): ExplicitJournalParseIssue[] {
  const dateSet = new Set(journalLines.map((l) => l.date).filter((d): d is string => d !== null));
  if (dateSet.size <= 1) return [];
  return [{
    code: 'INCONSISTENT_DATE',
    message: `Journal "${journalNumber}" has rows with conflicting dates: ${sortedStrings(dateSet).join(', ')}`,
    field: 'Date',
  }];
}

function firstPresent<Line, Value>(
  lines: Line[],
  getValue: (line: Line) => Value | null,
): Value | null {
  for (const line of lines) {
    const value = getValue(line);
    if (value !== null) return value;
  }
  return null;
}

export function parseJournalDebitCredit(
  rowIndex: number,
  mapped: Record<string, unknown>,
  includeNeitherIssue = true,
): DebitCreditResult {
  const issues: DebitCreditResult['issues'] = [];
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

  const debitParsed = debitRaw === undefined || debit !== null;
  const creditParsed = creditRaw === undefined || credit !== null;
  if (debitParsed && creditParsed) {
    if (debit && credit) {
      issues.push({
        code: 'BOTH_DEBIT_AND_CREDIT',
        message: `Journal line has both debit (${debit}) and credit (${credit}) — only one is allowed per line.`,
        field: 'Debit',
        rowIndex,
      });
    } else if (includeNeitherIssue && !debit && !credit) {
      issues.push({
        code: 'NEITHER_DEBIT_NOR_CREDIT',
        message: 'Journal line has neither a debit nor a credit amount.',
        field: 'Debit',
        rowIndex,
      });
    }
  }

  return { debit, credit, debitRaw, creditRaw, issues };
}

export function validateExplicitJournalLineBase(
  rowIndex: number,
  mapped: Record<string, unknown>,
  options: ExplicitLineOptions,
): ExplicitJournalLineBase {
  const issues: ExplicitJournalParseIssue[] = [];

  const journalNumber = trimOrNull(mapped.JournalNumber) ?? '';
  if (!journalNumber) {
    issues.push({
      code: 'MISSING_JOURNAL_NUMBER',
      message: options.missingJournalMessage,
      field: 'JournalNumber',
      rowIndex,
    });
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

  const { debit, credit, issues: amountIssues } = parseJournalDebitCredit(rowIndex, mapped);
  issues.push(...amountIssues);

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
    issues,
  };
}
