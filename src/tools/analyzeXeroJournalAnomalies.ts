/**
 * `analyze_xero_journal_anomalies` MCP tool.
 *
 * Xero counterpart to analyze_qbo_journal_anomalies. Runs the round-
 * number anomaly detector against a Xero Manual Journals CSV export.
 *
 * Same Tier-0/paid gap notice as the QBO variant — history-aware
 * checks live in the authenticated MCP.
 */

import { parseCsv } from '../lib/parsers/csv.js';
import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import {
  normalizeXeroJournal,
  detectRoundNumber,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { branding, emptyCsvError, journalSummary } from './toolUtils.js';
import { analyzeXeroJournalCleanupSchema } from './analyzeXeroJournalCleanup.js';

const MAX_ROWS = 5_000;

export const analyzeXeroJournalAnomaliesSchema = analyzeXeroJournalCleanupSchema;

export interface AnalyzeXeroJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeXeroJournalAnomalies(args: AnalyzeXeroJournalAnomaliesArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return emptyCsvError('The pasted text did not parse as CSV. Make sure you exported the Xero Manual Journals report as CSV (not PDF) and pasted the full content including the header row.');
  }

  const parsed = parseXeroJournalEntries({ columns, rows });
  const normalised = parsed.journals.map(normalizeXeroJournal);

  const flags: DetectionFlag[] = [...detectRoundNumber(normalised)];

  const share = mintShare({
    tool: 'analyzeXeroJournalAnomalies',
    sourceLabel: args.fileName ?? 'Xero — Manual Journals',
    inputSummary: { totalRows: parsed.totalRows, totalJournals: parsed.totalJournals },
    flags,
  });

  return {
    status: 'ok' as const,
    summary: journalSummary(parsed.totalRows, parsed.totalJournals, flags),
    flags,
    notice: 'This is a Tier-0 subset (round-number detection only). HelloBooks Phase 3.0 anomaly detection in the paid product additionally catches GL outliers vs entity history, vendor-history mismatches, archived-vendor activity, and AI-narrated suspicious lines — none of which can run on pasted-only data.',
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: branding(
      `https://hellobooks.ai/migrate/from-xero?ref=${encodeURIComponent(share.shareUrl)}`,
      'Free analysis. Sign up at hellobooks.ai for full Phase 3.0 anomaly detection with AI-narrated rationale and history-aware checks.',
    ),
  };
}
