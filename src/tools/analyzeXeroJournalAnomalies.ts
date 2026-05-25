/**
 * `analyze_xero_journal_anomalies` MCP tool.
 *
 * Xero counterpart to analyze_qbo_journal_anomalies. Runs the round-
 * number anomaly detector against a Xero Manual Journals CSV export.
 *
 * Same Tier-0/paid gap notice as the QBO variant — history-aware
 * checks live in the authenticated MCP.
 */

import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import { normalizeXeroJournal } from '../lib/detection/index.js';
import { analyzeJournalAnomalies } from './journalAnomaliesUtils.js';
export { analyzeXeroJournalCleanupSchema as analyzeXeroJournalAnomaliesSchema } from './analyzeXeroJournalCleanup.js';


export interface AnalyzeXeroJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeXeroJournalAnomalies(args: AnalyzeXeroJournalAnomaliesArgs) {
  return analyzeJournalAnomalies(args, {
    tool: 'analyzeXeroJournalAnomalies',
    defaultSourceLabel: 'Xero — Manual Journals',
    migrateSlug: 'from-xero',
    emptyCsvMessage: 'The pasted text did not parse as CSV. Make sure you exported the Xero Manual Journals report as CSV (not PDF) and pasted the full content including the header row.',
    parse: parseXeroJournalEntries,
    normalize: normalizeXeroJournal,
  });
}
