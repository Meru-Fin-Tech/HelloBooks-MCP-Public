/**
 * `analyze_qbo_journal_anomalies` MCP tool.
 *
 * Input: a QBO "Journal Entries" CSV export. Output: anomaly flags only
 * (round-number lines + share URL).
 *
 * Sibling to `analyze_qbo_journal_cleanup`. Splitting cleanup from
 * anomalies keeps the host-LLM context lean: the user typically asks
 * either "what's broken" (cleanup) or "what looks suspicious" (anomalies),
 * not both. Both tools share parsing + normalisation; the only difference
 * is which detectors run.
 *
 * Scope-vs-source — this Tier-0 tool ships only the anomaly detectors
 * that work on pasted data without entity history. Phase 3.0's other 4
 * types (archived vendor, GL outlier, vendor-history mismatch, LLM-
 * narrated suspicious) require the live HelloBooks account and stay
 * exclusive to the authenticated MCP / paid product.
 */

import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import { normalizeQboJournal } from '../lib/detection/index.js';
import { analyzeJournalAnomalies } from './journalAnomaliesUtils.js';
export { analyzeQboJournalCleanupSchema as analyzeQboJournalAnomaliesSchema } from './analyzeQboJournalCleanup.js';


export interface AnalyzeQboJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeQboJournalAnomalies(args: AnalyzeQboJournalAnomaliesArgs) {
  return analyzeJournalAnomalies(args, {
    tool: 'analyzeQboJournalAnomalies',
    defaultSourceLabel: 'QuickBooks Online — Journal Entries',
    migrateSlug: 'from-quickbooks',
    emptyCsvMessage: 'The pasted text did not parse as CSV. Make sure you exported the QBO Journal Entries report as CSV (not PDF or Excel) and pasted the full content including the header row.',
    parse: parseQboJournalEntries,
    normalize: normalizeQboJournal,
  });
}
