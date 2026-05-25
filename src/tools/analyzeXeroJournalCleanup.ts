/**
 * `analyze_xero_journal_cleanup` MCP tool.
 *
 * Xero counterpart to analyze_qbo_journal_cleanup. Different parser
 * idiom: Xero manual journals are identified by Reference (or Narration+
 * Date when Reference is blank), use signed `Amount` (positive = credit,
 * negative = debit) OR explicit Debit/Credit columns, and reference
 * accounts by Code rather than Name.
 *
 * Composes:
 *   parseCsv → parseXeroJournalEntries → normalizeXeroJournal
 *     → detectImbalance + detectDuplicates + schemaFlagsFromJournals
 *     → mintShare → response with `_branding` block
 *
 * Funnel CTA routes to /migrate/from-xero?ref=<shareUrl>.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import {
  normalizeXeroJournal,
  detectImbalance,
  detectDuplicates,
  schemaFlagsFromJournals,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { countBy } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeXeroJournalCleanupSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit. For larger files, sign up at hellobooks.ai for the authenticated MCP.`)
    .describe('Raw CSV text of a Xero "Manual Journals" report. Export from Xero: Accounting → Advanced → Manual Journals → Export. Paste the file contents directly.'),
  fileName: z.string().max(200).optional()
    .describe('Optional original filename, used only as a label on the share page.'),
};

export interface AnalyzeXeroJournalCleanupArgs {
  csvText: string;
  fileName?: string;
}

export function analyzeXeroJournalCleanup(args: AnalyzeXeroJournalCleanupArgs) {
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

  const flags: DetectionFlag[] = [
    ...detectImbalance(normalised),
    ...detectDuplicates(normalised),
    ...schemaFlagsFromJournals(parsed.journals, (j) => j.groupKey, (j) => j.reference ?? j.narration),
  ];

  const share = mintShare({
    tool: 'analyzeXeroJournalCleanup',
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
    parseDiagnostics: {
      columnMapping: parsed.columnMapping,
      unmappedColumns: parsed.unmappedColumns,
    },
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/from-xero?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: 'Free analysis. Sign up at hellobooks.ai to bulk-fix these in seconds, post adjusting JEs, and migrate your books in one click.',
    },
  };
}

