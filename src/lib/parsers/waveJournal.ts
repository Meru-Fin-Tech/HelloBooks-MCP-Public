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

export type IssueCode = ExplicitJournalIssueCode;
export type ParseIssue = ExplicitJournalParseIssue;
export type ParsedJournalLine = ExplicitJournalLineBase;
export type ParsedJournal = ExplicitParsedJournal<ParsedJournalLine>;
export type ParseInput = JournalParseInput;
export type ParseResult = ExplicitJournalParseResult<'WAVE', ParsedJournalLine>;

export function buildColumnMapping(sourceColumns: string[]): ColumnMapping {
  return buildAliasColumnMapping(sourceColumns, WAVE_JOURNAL_COLUMN_ALIASES);
}

function validateAndShapeLine(rowIndex: number, mapped: Record<string, unknown>): ParsedJournalLine {
  return validateExplicitJournalLineBase(rowIndex, mapped, {
    missingJournalMessage: 'Journal entry row needs a Transaction ID.',
  });
}

export function parseWaveJournalEntries(input: ParseInput): ParseResult {
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
    source: 'WAVE',
    entityType: 'JOURNAL_ENTRY',
    journals,
    totalRows: lines.length,
    totalJournals: journals.length,
    totalIssues,
    columnMapping: mapping,
    unmappedColumns,
  };
}
