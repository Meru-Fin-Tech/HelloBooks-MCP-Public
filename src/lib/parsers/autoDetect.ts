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
import { parseZohoJournalEntries, type ParseResult as ZohoParseResult } from './zohoJournal.js';
import { parseWaveJournalEntries, type ParseResult as WaveParseResult } from './waveJournal.js';
import {
  normalizeQboJournal,
  normalizeXeroJournal,
  normalizeZohoJournal,
  normalizeWaveJournal,
  type NormalizedJournal,
} from '../detection/index.js';

export type DetectedSource = 'QBO' | 'XERO' | 'ZOHO' | 'WAVE';

/**
 * Map a detected source to the canonical `/migrate/from-<slug>` URL path
 * on hellobooks.ai. Web-Fire-hellobooks.ai uses the `from-` prefix on
 * its migrate pages — see `src/app/migrate/from-quickbooks/` and
 * `from-wave/`. Tools that omit the prefix will 404.
 */
export function sourceToMigrateSlug(source: DetectedSource): string {
  switch (source) {
    case 'QBO':  return 'from-quickbooks';
    case 'XERO': return 'from-xero';
    case 'ZOHO': return 'from-zoho';
    case 'WAVE': return 'from-wave';
  }
}

/** Human-readable label for the detected source — used in share-page UI. */
export function sourceToHumanLabel(source: DetectedSource): string {
  switch (source) {
    case 'QBO':  return 'QuickBooks Online';
    case 'XERO': return 'Xero';
    case 'ZOHO': return 'Zoho Books';
    case 'WAVE': return 'Wave';
  }
}

/**
 * Heuristic ordering — strongest disambiguator first:
 *
 *   1. WAVE — `transaction id` column is a Wave-only signature.
 *   2. XERO — `narration`, `reference`, or `accountcode` are Xero idioms.
 *   3. ZOHO — `journal date` (with a space) or `currency code` plus a Zoho
 *      grouping field (`journal number`).
 *   4. QBO  — generic `num` / `je no` / `journal no` / `journal number`
 *      with no Xero/Zoho-specific signal.
 *
 * Returns null when none of the signatures match.
 */
export function detectSource(columns: string[]): DetectedSource | null {
  const set = new Set(columns.map(normalizeHeader));

  if (set.has('transaction id')) {
    return 'WAVE';
  }
  if (set.has('narration') || set.has('reference') || set.has('accountcode') || set.has('account code')) {
    return 'XERO';
  }
  // Zoho distinguishing signal — "journal date" (space-separated) or
  // "currency code" alongside a journal-number column.
  if (set.has('journal date') || set.has('currency code')) {
    return 'ZOHO';
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
    return { source, journals: parsed.journals.map(normalizeQboJournal), totalRows: parsed.totalRows, totalJournals: parsed.totalJournals };
  }
  if (source === 'XERO') {
    const parsed: XeroParseResult = parseXeroJournalEntries({ columns, rows });
    return { source, journals: parsed.journals.map(normalizeXeroJournal), totalRows: parsed.totalRows, totalJournals: parsed.totalJournals };
  }
  if (source === 'ZOHO') {
    const parsed: ZohoParseResult = parseZohoJournalEntries({ columns, rows });
    return { source, journals: parsed.journals.map(normalizeZohoJournal), totalRows: parsed.totalRows, totalJournals: parsed.totalJournals };
  }
  const parsed: WaveParseResult = parseWaveJournalEntries({ columns, rows });
  return { source, journals: parsed.journals.map(normalizeWaveJournal), totalRows: parsed.totalRows, totalJournals: parsed.totalJournals };
}
