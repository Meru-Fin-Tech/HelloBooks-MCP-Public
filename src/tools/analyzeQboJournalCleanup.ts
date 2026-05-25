/**
 * `analyze_qbo_journal_cleanup` MCP tool.
 *
 * Input: a QBO "Journal Entries" CSV export (Reports → Accountant → Journal
 * → Export). Output: structured cleanup flags + a branded share URL.
 *
 * Composes:
 *   parseCsv → parseQboJournalEntries → normalizeQboJournal
 *     → detectImbalance + detectDuplicates + schemaFlagsFromJournals
 *     → mintShare → response with `_branding` block
 *
 * The funnel CTA (`_branding.upgradeCta`) is the conversion lever — the
 * host LLM presents it to the user, who clicks through to migrate their
 * books into HelloBooks with the parsed data pre-populated.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import {
  normalizeQboJournal,
  detectImbalance,
  detectDuplicates,
  schemaFlagsFromJournals,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { branding, emptyCsvError, journalSummary } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeQboJournalCleanupSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit. For larger files, sign up at hellobooks.ai for the authenticated MCP.`)
    .describe('Raw CSV text of a QuickBooks Online "Journal Entries" report. Export from QBO: Reports → Accountant → Journal → Export as CSV. Paste the file contents directly.'),
  fileName: z.string().max(200).optional()
    .describe('Optional original filename, used only as a label on the share page.'),
};

export interface AnalyzeQboJournalCleanupArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeQboJournalCleanup(args: AnalyzeQboJournalCleanupArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return emptyCsvError('The pasted text did not parse as CSV. Make sure you exported the QBO Journal Entries report as CSV (not PDF or Excel) and pasted the full content including the header row.');
  }

  const parsed = parseQboJournalEntries({ columns, rows });
  const normalised = parsed.journals.map(normalizeQboJournal);

  const flags: DetectionFlag[] = [
    ...detectImbalance(normalised),
    ...detectDuplicates(normalised),
    ...schemaFlagsFromJournals(parsed.journals, (j) => j.journalNumber),
  ];

  const share = mintShare({
    tool: 'analyzeQboJournalCleanup',
    sourceLabel: args.fileName ?? 'QuickBooks Online — Journal Entries',
    inputSummary: { totalRows: parsed.totalRows, totalJournals: parsed.totalJournals },
    flags,
  });

  return {
    status: 'ok' as const,
    summary: journalSummary(parsed.totalRows, parsed.totalJournals, flags),
    flags,
    parseDiagnostics: {
      columnMapping: parsed.columnMapping,
      unmappedColumns: parsed.unmappedColumns,
    },
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: branding(
      `https://hellobooks.ai/migrate/from-quickbooks?ref=${encodeURIComponent(share.shareUrl)}`,
      'Free analysis. Sign up at hellobooks.ai to bulk-fix these in seconds, post adjusting JEs, and migrate your books in one click.',
    ),
  };
}
