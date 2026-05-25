/**
 * `analyze_journal_variance` MCP tool.
 *
 * Compares two periods of journal-entry data (QBO or Xero CSV — source
 * auto-detected from headers) and flags accounts whose movement
 * deviates materially between periods.
 *
 * Use case: a CA paste this period's GL and last period's GL and asks
 * "what changed". The tool surfaces accounts where the period-over-
 * period change crosses materiality (≥5% relative + ≥$100 absolute).
 *
 * Funnel CTA routes to the appropriate source-specific migrate page.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseAndNormalize, sourceToMigrateSlug } from '../lib/parsers/autoDetect.js';
import { detectVariance, type DetectionFlag } from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { countBy } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeJournalVarianceSchema = {
  periodACsv: z.string()
    .min(1, 'periodACsv is required')
    .max(MAX_CSV_BYTES, `periodACsv exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of the EARLIER period\'s journal-entry export (QBO Journal Entries or Xero Manual Journals). Source is auto-detected from the headers.'),
  periodBCsv: z.string()
    .min(1, 'periodBCsv is required')
    .max(MAX_CSV_BYTES, `periodBCsv exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of the LATER period\'s journal-entry export. Source is auto-detected from the headers (must match periodACsv).'),
  periodALabel: z.string().max(80).optional()
    .describe('Optional human label for the earlier period — e.g. "Q1 FY2024". Used in flag messages.'),
  periodBLabel: z.string().max(80).optional()
    .describe('Optional human label for the later period — e.g. "Q2 FY2024".'),
};

export interface AnalyzeJournalVarianceArgs {
  periodACsv: string;
  periodBCsv: string;
  periodALabel?: string;
  periodBLabel?: string;
}

export function analyzeJournalVariance(args: AnalyzeJournalVarianceArgs) {
  const a = parseCsv(args.periodACsv, { maxRows: MAX_ROWS });
  const b = parseCsv(args.periodBCsv, { maxRows: MAX_ROWS });
  if (a.columns.length === 0 || b.columns.length === 0) {
    return errorResponse('empty_or_invalid_csv', 'One or both periods did not parse as CSV. Paste both period exports including the header row.');
  }

  const aResult = parseAndNormalize(a.columns, a.rows);
  const bResult = parseAndNormalize(b.columns, b.rows);
  if (aResult === null || bResult === null) {
    return errorResponse('unknown_source', 'Could not detect QBO or Xero from the headers. Expected QBO "Journal Entries" or Xero "Manual Journals" CSV exports.');
  }
  if (aResult.source !== bResult.source) {
    return errorResponse('source_mismatch', `Period A is ${aResult.source} but Period B is ${bResult.source}. Compare like-for-like — paste two exports from the same source.`);
  }

  const periodALabel = args.periodALabel ?? 'Period A';
  const periodBLabel = args.periodBLabel ?? 'Period B';

  const flags: DetectionFlag[] = detectVariance(
    { label: periodALabel, journals: aResult.journals },
    { label: periodBLabel, journals: bResult.journals },
  );

  const share = mintShare({
    tool: 'analyzeJournalVariance',
    sourceLabel: `${aResult.source} variance — ${periodALabel} vs ${periodBLabel}`,
    inputSummary: {
      totalRows: aResult.totalRows + bResult.totalRows,
      totalJournals: aResult.totalJournals + bResult.totalJournals,
    },
    flags,
  });

  const migrateSlug = sourceToMigrateSlug(aResult.source);
  return {
    status: 'ok' as const,
    source: aResult.source,
    summary: {
      totalRowsA: aResult.totalRows,
      totalRowsB: bResult.totalRows,
      totalJournalsA: aResult.totalJournals,
      totalJournalsB: bResult.totalJournals,
      totalFlags: flags.length,
      bySeverity: countBy(flags, (f) => f.severity),
    },
    flags,
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: 'Free analysis. Sign up at hellobooks.ai for AI-narrated variance commentary, conversational acknowledge ("acknowledge the Travel jump, it is the kickoff event"), and per-class drill-downs.',
    },
  };
}

function errorResponse(error: string, message: string) {
  return { status: 'error' as const, error, message };
}

