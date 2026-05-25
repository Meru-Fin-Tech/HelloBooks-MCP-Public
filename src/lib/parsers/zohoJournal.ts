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

import { trimOrNull } from './fieldUtils.js';
import {
  applyColumnMapping,
  buildAliasColumnMapping,
  groupExplicitJournals,
  rowHasValues,
  validateExplicitJournalLineBase,
  type ColumnMapping,
  type ExplicitJournalIssueCode,
  type ExplicitJournalLineBase,
  type ExplicitJournalParseIssue,
  type ExplicitJournalParseResult,
  type ExplicitParsedJournal,
  type JournalParseInput,
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

export type IssueCode = ExplicitJournalIssueCode;
export type ParseIssue = ExplicitJournalParseIssue;
export type ParsedJournalLine = ExplicitJournalLineBase & { status: string | null };
export type ParsedJournal = ExplicitParsedJournal<ParsedJournalLine>;
export type ParseInput = JournalParseInput;
export type ParseResult = ExplicitJournalParseResult<'ZOHO', ParsedJournalLine>;

export function buildColumnMapping(sourceColumns: string[]): ColumnMapping {
  return buildAliasColumnMapping(sourceColumns, ZOHO_JOURNAL_COLUMN_ALIASES);
}

function validateAndShapeLine(rowIndex: number, mapped: Record<string, unknown>): ParsedJournalLine {
  return {
    ...validateExplicitJournalLineBase(rowIndex, mapped, {
      missingJournalMessage: 'Journal entry row needs a Journal Number.',
    }),
    status: trimOrNull(mapped.Status),
  };
}

export function parseZohoJournalEntries(input: ParseInput): ParseResult {
  const mapping = buildColumnMapping(input.columns);
  const unmappedColumns = Object.entries(mapping)
    .filter(([, hb]) => hb === null)
    .map(([col]) => col);

  const lines: ParsedJournalLine[] = [];
  input.rows.forEach((raw, idx) => {
    if (!rowHasValues(raw)) return;
    const mapped = applyColumnMapping(raw, mapping);
    lines.push(validateAndShapeLine(idx + 1, mapped));
  });

  const journals = groupExplicitJournals(lines);

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
