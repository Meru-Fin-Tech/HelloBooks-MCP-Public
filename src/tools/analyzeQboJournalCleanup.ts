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

import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import {
  normalizeQboJournal,
  schemaFlagsFromJournals,
} from '../lib/detection/index.js';
import { analyzeJournalCleanup } from './journalCleanupUtils.js';

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
  return analyzeJournalCleanup(args, {
    tool: 'analyzeQboJournalCleanup',
    defaultSourceLabel: 'QuickBooks Online — Journal Entries',
    migrateSlug: 'from-quickbooks',
    emptyCsvMessage: 'The pasted text did not parse as CSV. Make sure you exported the QBO Journal Entries report as CSV (not PDF or Excel) and pasted the full content including the header row.',
    parse: parseQboJournalEntries,
    normalize: normalizeQboJournal,
    schemaFlags: (journals) => schemaFlagsFromJournals(journals, (j) => j.journalNumber),
  });
}
