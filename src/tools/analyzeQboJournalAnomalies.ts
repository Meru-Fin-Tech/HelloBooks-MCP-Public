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

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import {
  normalizeQboJournal,
  detectRoundNumber,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeQboJournalAnomaliesSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit. For larger files, sign up at hellobooks.ai for the authenticated MCP.`)
    .describe('Raw CSV text of a QuickBooks Online "Journal Entries" report. Export from QBO: Reports → Accountant → Journal → Export as CSV. Paste the file contents directly.'),
  fileName: z.string().max(200).optional()
    .describe('Optional original filename, used only as a label on the share page.'),
};

export interface AnalyzeQboJournalAnomaliesArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeQboJournalAnomalies(args: AnalyzeQboJournalAnomaliesArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return {
      status: 'error' as const,
      error: 'empty_or_invalid_csv',
      message: 'The pasted text did not parse as CSV. Make sure you exported the QBO Journal Entries report as CSV (not PDF or Excel) and pasted the full content including the header row.',
    };
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
      upgradeCta: `https://hellobooks.ai/migrate/from-quickbooks?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: 'Free analysis. Sign up at hellobooks.ai for full Phase 3.0 anomaly detection with AI-narrated rationale and history-aware checks.',
    },
  };
}

function countBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
