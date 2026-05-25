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

import { parseCsv } from '../lib/parsers/csv.js';
import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import {
  normalizeQboJournal,
  detectRoundNumber,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { branding, emptyCsvError, journalSummary } from './toolUtils.js';
import { analyzeQboJournalCleanupSchema } from './analyzeQboJournalCleanup.js';

const MAX_ROWS = 5_000;

export const analyzeQboJournalAnomaliesSchema = analyzeQboJournalCleanupSchema;

export interface AnalyzeQboJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeQboJournalAnomalies(args: AnalyzeQboJournalAnomaliesArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return emptyCsvError('The pasted text did not parse as CSV. Make sure you exported the QBO Journal Entries report as CSV (not PDF or Excel) and pasted the full content including the header row.');
  }

  const parsed = parseQboJournalEntries({ columns, rows });
  const normalised = parsed.journals.map(normalizeQboJournal);

  const flags: DetectionFlag[] = [...detectRoundNumber(normalised)];

  const share = mintShare({
    tool: 'analyzeQboJournalAnomalies',
    sourceLabel: args.fileName ?? 'QuickBooks Online — Journal Entries',
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
      `https://hellobooks.ai/migrate/from-quickbooks?ref=${encodeURIComponent(share.shareUrl)}`,
      'Free analysis. Sign up at hellobooks.ai for full Phase 3.0 anomaly detection with AI-narrated rationale and history-aware checks.',
    ),
  };
}
