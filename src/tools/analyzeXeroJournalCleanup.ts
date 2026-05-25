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

import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import {
  normalizeXeroJournal,
  schemaFlagsFromJournals,
} from '../lib/detection/index.js';
import { analyzeJournalCleanup } from './journalCleanupUtils.js';

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
  return analyzeJournalCleanup(args, {
    tool: 'analyzeXeroJournalCleanup',
    defaultSourceLabel: 'Xero — Manual Journals',
    migrateSlug: 'from-xero',
    emptyCsvMessage: 'The pasted text did not parse as CSV. Make sure you exported the Xero Manual Journals report as CSV (not PDF) and pasted the full content including the header row.',
    parse: parseXeroJournalEntries,
    normalize: normalizeXeroJournal,
    schemaFlags: (journals) => schemaFlagsFromJournals(journals, (j) => j.groupKey, (j) => j.reference ?? j.narration),
  });
}
