/**
 * Auto-detect QBO vs Xero from CSV column headers.
 *
 * QBO Journal Entries headers: Date, Num, Account, Debit, Credit, Memo, Name, Class
 * Xero Manual Journals headers: Narration, Date, Reference, AccountCode, Description,
 *                               TaxType, Amount, TrackingName1, TrackingOption1
 *
 * Heuristic — strong Xero signals win first:
 *   • If `Narration` or `Reference` or `AccountCode` present → XERO
 *   • If `Num` or `JournalNumber` present → QBO
 *   • Else → null (caller falls back to user hint or returns error)
 */

import { normalizeHeader } from './fieldUtils.js';
import { parseQboJournalEntries, type ParseResult as QboParseResult } from './qboJournal.js';
import { parseXeroJournalEntries, type ParseResult as XeroParseResult } from './xeroJournal.js';
import { normalizeQboJournal, normalizeXeroJournal, type NormalizedJournal } from '../detection/index.js';

export type DetectedSource = 'QBO' | 'XERO';

export function detectSource(columns: string[]): DetectedSource | null {
  const set = new Set(columns.map(normalizeHeader));
  if (set.has('narration') || set.has('reference') || set.has('accountcode') || set.has('account code')) {
    return 'XERO';
  }
  if (set.has('num') || set.has('journal number') || set.has('journal no') || set.has('je no')) {
    return 'QBO';
  }
  return null;
}

/**
 * Parse + normalise a journal-entry CSV using the detected source.
 * Returns `null` when the source cannot be inferred.
 */
export function parseAndNormalize(
  columns: string[],
  rows: Record<string, string>[],
): { source: DetectedSource; journals: NormalizedJournal[]; totalRows: number; totalJournals: number } | null {
  const source = detectSource(columns);
  if (source === null) return null;

  if (source === 'QBO') {
    const parsed: QboParseResult = parseQboJournalEntries({ columns, rows });
    return {
      source,
      journals: parsed.journals.map(normalizeQboJournal),
      totalRows: parsed.totalRows,
      totalJournals: parsed.totalJournals,
    };
  }
  const parsed: XeroParseResult = parseXeroJournalEntries({ columns, rows });
  return {
    source,
    journals: parsed.journals.map(normalizeXeroJournal),
    totalRows: parsed.totalRows,
    totalJournals: parsed.totalJournals,
  };
}
