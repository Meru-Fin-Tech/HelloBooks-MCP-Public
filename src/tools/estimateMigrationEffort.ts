/**
 * `estimate_migration_effort` MCP tool.
 *
 * Takes a journal-entry CSV (QBO or Xero) and returns a structured
 * migration-effort estimate — row count, unique-account count, complexity
 * factors, time + price quote — plus a "Start migration" CTA.
 *
 * Pure heuristic; the real migration on the paid side will refine the
 * quote against the live entity. This is the funnel hook — gives the
 * user a concrete number to weigh against doing it themselves.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseAndNormalize, sourceToMigrateSlug } from '../lib/parsers/autoDetect.js';
import { mintShare } from '../lib/shareUrl/index.js';
import type { NormalizedJournal, NormalizedLine } from '../lib/detection/index.js';

const MAX_ROWS = 50_000; // Allow larger inputs for sizing — the analytical detectors are skipped.
const MAX_CSV_BYTES = 20 * 1024 * 1024;

export const estimateMigrationEffortSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit. For larger files, sign up at hellobooks.ai.`)
    .describe('Raw CSV text of a journal-entry export from QBO ("Journal Entries") or Xero ("Manual Journals"). Source is auto-detected from headers.'),
  fileName: z.string().max(200).optional(),
};

export interface EstimateMigrationEffortArgs {
  csvText: string;
  fileName?: string;
}

type Complexity = 'low' | 'medium' | 'high';
interface MigrationSizing {
  uniqueAccounts: Set<string>;
  earliestDate: string | null;
  latestDate: string | null;
}

export function estimateMigrationEffort(args: EstimateMigrationEffortArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });
  if (columns.length === 0) {
    return { status: 'error' as const, error: 'empty_or_invalid_csv', message: 'The pasted text did not parse as CSV.' };
  }

  const result = parseAndNormalize(columns, rows);
  if (result === null) {
    return { status: 'error' as const, error: 'unknown_source', message: 'Could not detect QBO or Xero from the headers.' };
  }

  const sizing = collectSizing(result.journals);

  const complexity = estimateComplexity({
    journalCount: result.totalJournals,
    rowCount: result.totalRows,
    accountCount: sizing.uniqueAccounts.size,
  });

  const { hours, priceUsd } = quoteForComplexity(complexity, result.totalJournals);

  const share = mintShare({
    tool: 'estimateMigrationEffort',
    sourceLabel: args.fileName ?? `${result.source} migration estimate`,
    inputSummary: { totalRows: result.totalRows, totalJournals: result.totalJournals },
    flags: [],
  });

  const migrateSlug = sourceToMigrateSlug(result.source);
  return {
    status: 'ok' as const,
    source: result.source,
    sizing: {
      totalRows: result.totalRows,
      totalJournals: result.totalJournals,
      uniqueAccounts: sizing.uniqueAccounts.size,
      earliestDate: sizing.earliestDate,
      latestDate: sizing.latestDate,
    },
    complexity,
    estimate: {
      humanHours: hours,
      assistedHours: Math.max(1, Math.ceil(hours / 10)),
      priceUsd,
      assumptions: [
        'Assumes 1 chart-of-accounts mapping pass per 50 unique accounts.',
        'Assumes 1 manual review pass per 1,000 journal lines.',
        'Excludes opening-balance / trial-balance reconciliation (separate scope).',
        'Excludes integrations re-wiring (banks, payment processors, payroll).',
      ],
    },
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: `Estimated ~${hours} human hours / $${priceUsd} for manual migration. HelloBooks's assisted migration cuts this to ~${Math.max(1, Math.ceil(hours / 10))} hours with the parsed data pre-populated. Click the CTA to start.`,
    },
  };
}

function collectSizing(journals: NormalizedJournal[]): MigrationSizing {
  const sizing: MigrationSizing = {
    uniqueAccounts: new Set<string>(),
    earliestDate: null,
    latestDate: null,
  };
  for (const journal of journals) {
    addAccounts(sizing.uniqueAccounts, journal.lines);
    updateDateRange(sizing, journal.date);
  }
  return sizing;
}

function addAccounts(uniqueAccounts: Set<string>, lines: NormalizedLine[]): void {
  for (const line of lines) {
    if (line.accountIdentifier) uniqueAccounts.add(line.accountIdentifier);
  }
}

function updateDateRange(sizing: MigrationSizing, date: string | null): void {
  if (!date) return;
  if (sizing.earliestDate === null || date < sizing.earliestDate) sizing.earliestDate = date;
  if (sizing.latestDate === null || date > sizing.latestDate) sizing.latestDate = date;
}

function estimateComplexity(s: { journalCount: number; rowCount: number; accountCount: number }): Complexity {
  // Three contributing axes — pick the highest. Rough heuristic; the
  // paid product refines against the live entity.
  if (s.journalCount >= 1_000 || s.rowCount >= 5_000 || s.accountCount >= 100) return 'high';
  if (s.journalCount >= 200   || s.rowCount >= 1_000 || s.accountCount >= 30)  return 'medium';
  return 'low';
}

function quoteForComplexity(c: Complexity, journalCount: number): { hours: number; priceUsd: number } {
  // Manual-migration heuristic — $150/hr blended rate. Scales with
  // journal count; floor / ceiling per complexity band.
  const hourlyRate = 150;
  let hours: number;
  switch (c) {
    case 'high':   hours = Math.min(120, Math.max(40, Math.ceil(journalCount / 40))); break;
    case 'medium': hours = Math.min(40,  Math.max(8,  Math.ceil(journalCount / 30))); break;
    case 'low':    hours = Math.min(8,   Math.max(2,  Math.ceil(journalCount / 20))); break;
  }
  return { hours, priceUsd: hours * hourlyRate };
}
