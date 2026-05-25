/**
 * `analyze_xero_journal_anomalies` MCP tool.
 *
 * Xero counterpart to analyze_qbo_journal_anomalies. Runs the round-
 * number anomaly detector against a Xero Manual Journals CSV export.
 *
 * Same Tier-0/paid gap notice as the QBO variant — history-aware
 * checks live in the authenticated MCP.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import {
  normalizeXeroJournal,
  detectRoundNumber,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { countBy } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeXeroJournalAnomaliesSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit. For larger files, sign up at hellobooks.ai for the authenticated MCP.`)
    .describe('Raw CSV text of a Xero "Manual Journals" report. Export from Xero: Accounting → Advanced → Manual Journals → Export. Paste the file contents directly.'),
  fileName: z.string().max(200).optional()
    .describe('Optional original filename, used only as a label on the share page.'),
};

export interface AnalyzeXeroJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeXeroJournalAnomalies(args: AnalyzeXeroJournalAnomaliesArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return {
      status: 'error' as const,
      error: 'empty_or_invalid_csv',
      message: 'The pasted text did not parse as CSV. Make sure you exported the Xero Manual Journals report as CSV (not PDF) and pasted the full content including the header row.',
    };
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
    summary: {
      totalRows: parsed.totalRows,
      totalJournals: parsed.totalJournals,
      totalFlags: flags.length,
      byCategory: countBy(flags, (f) => f.category),
      bySeverity: countBy(flags, (f) => f.severity),
    },
    flags,
    notice: 'This is a Tier-0 subset (round-number detection only). HelloBooks Phase 3.0 anomaly detection in the paid product additionally catches GL outliers vs entity history, vendor-history mismatches, archived-vendor activity, and AI-narrated suspicious lines — none of which can run on pasted-only data.',
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/from-xero?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: 'Free analysis. Sign up at hellobooks.ai for full Phase 3.0 anomaly detection with AI-narrated rationale and history-aware checks.',
    },
  };
}

