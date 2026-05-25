import { normalizeHeader, parseDecimal, scalarToString } from './fieldUtils.js';

export interface JournalParseIssue {
  code: string;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface DebitCreditResult {
  debit: number | null;
  credit: number | null;
  issues: JournalParseIssue[];
}

export interface ParseInputLike {
  rows: Record<string, unknown>[];
}

export interface JournalLineBase {
  date: string | null;
  debit: number | null;
  credit: number | null;
  issues: JournalParseIssue[];
}

interface GroupJournalOptions<TLine extends JournalLineBase, TJournal> {
  lines: TLine[];
  getKey: (line: TLine) => string;
  describe: (key: string) => string;
  includeUnbalancedIssue?: boolean;
  makeJournal: (ctx: GroupJournalContext<TLine>) => TJournal;
}

export interface GroupJournalContext<TLine extends JournalLineBase> {
  key: string;
  label: string;
  lines: TLine[];
  date: string | null;
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
  issues: JournalParseIssue[];
}

export interface DebitCreditMessages {
  invalidDebit: (raw: unknown) => string;
  invalidCredit: (raw: unknown) => string;
  both?: (debit: number, credit: number) => string;
  neither?: string;
}

export function buildAliasColumnMapping(
  sourceColumns: string[],
  aliasesByField: Record<string, string[]>,
): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  const normalizedAliases = Object.entries(aliasesByField).map(([field, aliases]) => ({
    field,
    aliases: new Set(aliases.map(normalizeHeader)),
  }));

  for (const col of sourceColumns) {
    const norm = normalizeHeader(col);
    const match = normalizedAliases.find(({ aliases }) => aliases.has(norm));
    mapping[col] = match?.field ?? null;
  }
  return mapping;
}

export function applyColumnMapping(
  rawRow: Record<string, unknown>,
  mapping: Record<string, string | null>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [srcCol, hbField] of Object.entries(mapping)) {
    if (!hbField) continue;
    const v = rawRow[srcCol];
    if (isBlankValue(v)) continue;
    out[hbField] = v;
  }
  return out;
}

export function hasAnyValue(rawRow: Record<string, unknown>): boolean {
  return Object.values(rawRow).some((v) => !isBlankValue(v));
}

export function unmappedColumns(mapping: Record<string, string | null>): string[] {
  return Object.entries(mapping)
    .filter(([, hb]) => hb === null)
    .map(([col]) => col);
}

export function parseMappedRows<TLine>(
  input: ParseInputLike,
  mapping: Record<string, string | null>,
  validate: (rowIndex: number, mapped: Record<string, unknown>) => TLine,
): TLine[] {
  const lines: TLine[] = [];
  input.rows.forEach((raw, idx) => {
    if (!hasAnyValue(raw)) return;
    lines.push(validate(idx + 1, applyColumnMapping(raw, mapping)));
  });
  return lines;
}

export function parseExplicitDebitCredit(
  rowIndex: number,
  mapped: Record<string, unknown>,
  messages: DebitCreditMessages,
): DebitCreditResult {
  const issues: JournalParseIssue[] = [];
  const debitRaw = mapped.Debit;
  const creditRaw = mapped.Credit;
  const debit = debitRaw !== undefined ? parseDecimal(debitRaw) : null;
  const credit = creditRaw !== undefined ? parseDecimal(creditRaw) : null;

  if (debitRaw !== undefined && debit === null) {
    issues.push({ code: 'INVALID_DECIMAL', message: messages.invalidDebit(debitRaw), field: 'Debit', rowIndex });
  }
  if (creditRaw !== undefined && credit === null) {
    issues.push({ code: 'INVALID_DECIMAL', message: messages.invalidCredit(creditRaw), field: 'Credit', rowIndex });
  }

  const debitParsed = debitRaw === undefined || debit !== null;
  const creditParsed = creditRaw === undefined || credit !== null;
  if (debitParsed && creditParsed) {
    if (debit && credit && messages.both) {
      issues.push({ code: 'BOTH_DEBIT_AND_CREDIT', message: messages.both(debit, credit), field: 'Debit', rowIndex });
    } else if (!debit && !credit && messages.neither) {
      issues.push({ code: 'NEITHER_DEBIT_NOR_CREDIT', message: messages.neither, field: 'Debit', rowIndex });
    }
  }

  return { debit, credit, issues };
}

export function groupByFirstSeen<T>(
  items: T[],
  getKey: (item: T) => string,
): Array<{ key: string; items: T[] }> {
  const order: string[] = [];
  const byKey = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!byKey.has(key)) {
      order.push(key);
      byKey.set(key, []);
    }
    byKey.get(key)!.push(item);
  }
  return order.map((key) => ({ key, items: byKey.get(key)! }));
}

export function dateConflictIssue(journalLabel: string, dates: Set<string>): JournalParseIssue {
  const sortedDates = [...dates].sort((a, b) => a.localeCompare(b));
  return {
    code: 'INCONSISTENT_DATE',
    message: `Journal "${journalLabel}" has rows with conflicting dates: ${sortedDates.join(', ')}`,
    field: 'Date',
  };
}

export function groupJournalLines<TLine extends JournalLineBase, TJournal>(
  options: GroupJournalOptions<TLine, TJournal>,
): TJournal[] {
  return groupByFirstSeen(options.lines, options.getKey).map(({ key, items }) => {
    const label = options.describe(key);
    const totalDebits = items.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredits = items.reduce((s, l) => s + (l.credit ?? 0), 0);
    const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
    const issues = groupedJournalIssues(items, label, totalDebits, totalCredits, balanced, options.includeUnbalancedIssue === true);

    return options.makeJournal({
      key,
      label,
      lines: items,
      date: firstDate(items),
      totalDebits,
      totalCredits,
      balanced,
      issues,
    });
  });
}

export function countJournalIssues<TLine extends { issues: JournalParseIssue[] }, TJournal extends { issues: JournalParseIssue[] }>(
  journals: TJournal[],
  lines: TLine[],
): number {
  let totalIssues = 0;
  for (const j of journals) totalIssues += j.issues.length;
  for (const l of lines) totalIssues += l.issues.length;
  return totalIssues;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function groupedJournalIssues<TLine extends JournalLineBase>(
  lines: TLine[],
  label: string,
  totalDebits: number,
  totalCredits: number,
  balanced: boolean,
  includeUnbalancedIssue: boolean,
): JournalParseIssue[] {
  const issues: JournalParseIssue[] = [];
  const dateSet = new Set(lines.map((l) => l.date).filter((d): d is string => d !== null));
  if (dateSet.size > 1) issues.push(dateConflictIssue(label, dateSet));
  if (includeUnbalancedIssue && !balanced) {
    issues.push({
      code: 'UNBALANCED_JOURNAL',
      message: `Journal "${label}" is unbalanced: debits ${totalDebits.toFixed(2)} vs credits ${totalCredits.toFixed(2)} (diff ${(totalDebits - totalCredits).toFixed(2)})`,
      field: 'Debit',
    });
  }
  return issues;
}

function firstDate<TLine extends JournalLineBase>(lines: TLine[]): string | null {
  return lines.find((l) => l.date)?.date ?? null;
}

function isBlankValue(v: unknown): boolean {
  return v === undefined || v === null || scalarToString(v).trim() === '';
}
