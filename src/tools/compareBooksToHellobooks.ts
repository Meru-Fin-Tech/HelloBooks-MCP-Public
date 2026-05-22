/**
 * `compare_books_to_hellobooks` MCP tool.
 *
 * Takes a journal-entry CSV (QBO or Xero, source auto-detected), runs
 * the full cleanup + anomaly + schema detection set, then frames the
 * output as a competitive comparison: "your books have X issues; here
 * is how HelloBooks resolves each phase."
 *
 * Direct funnel tool — the response is structured to make the upgrade
 * case for the host LLM to narrate to the user.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseAndNormalize, sourceToMigrateSlug, sourceToHumanLabel } from '../lib/parsers/autoDetect.js';
import { parseQboJournalEntries } from '../lib/parsers/qboJournal.js';
import { parseXeroJournalEntries } from '../lib/parsers/xeroJournal.js';
import { parseZohoJournalEntries } from '../lib/parsers/zohoJournal.js';
import { parseWaveJournalEntries } from '../lib/parsers/waveJournal.js';
import {
  detectImbalance,
  detectDuplicates,
  detectRoundNumber,
  schemaFlagsFromJournals,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const compareBooksToHellobooksSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of a journal-entry export from QBO ("Journal Entries") or Xero ("Manual Journals"). Source is auto-detected from the headers.'),
  fileName: z.string().max(200).optional()
    .describe('Optional filename label.'),
};

export interface CompareBooksToHellobooksArgs {
  csvText: string;
  fileName?: string;
}

export function compareBooksToHellobooks(args: CompareBooksToHellobooksArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });
  if (columns.length === 0) {
    return { status: 'error' as const, error: 'empty_or_invalid_csv', message: 'The pasted text did not parse as CSV.' };
  }

  const result = parseAndNormalize(columns, rows);
  if (result === null) {
    return { status: 'error' as const, error: 'unknown_source', message: 'Could not detect QBO or Xero from the headers.' };
  }

  // Re-parse the raw shape to access parser issues for the schema bridge —
  // parseAndNormalize returns the normalised shape only.
  const flags: DetectionFlag[] = [
    ...detectImbalance(result.journals),
    ...detectDuplicates(result.journals),
    ...detectRoundNumber(result.journals),
  ];
  switch (result.source) {
    case 'QBO': {
      const raw = parseQboJournalEntries({ columns, rows });
      flags.push(...schemaFlagsFromJournals(raw.journals, (j) => j.journalNumber));
      break;
    }
    case 'XERO': {
      const raw = parseXeroJournalEntries({ columns, rows });
      flags.push(...schemaFlagsFromJournals(raw.journals, (j) => j.groupKey, (j) => j.reference ?? j.narration));
      break;
    }
    case 'ZOHO': {
      const raw = parseZohoJournalEntries({ columns, rows });
      flags.push(...schemaFlagsFromJournals(raw.journals, (j) => j.journalNumber, (j) => j.reference ?? j.notes));
      break;
    }
    case 'WAVE': {
      const raw = parseWaveJournalEntries({ columns, rows });
      flags.push(...schemaFlagsFromJournals(raw.journals, (j) => j.journalNumber, (j) => j.reference ?? j.notes));
      break;
    }
  }

  const phaseMap = buildPhaseMap(flags);

  const share = mintShare({
    tool: 'compareBooksToHellobooks',
    sourceLabel: args.fileName ?? `${result.source} journal export`,
    inputSummary: { totalRows: result.totalRows, totalJournals: result.totalJournals },
    flags,
  });

  const migrateSlug = sourceToMigrateSlug(result.source);
  return {
    status: 'ok' as const,
    source: result.source,
    summary: {
      totalRows: result.totalRows,
      totalJournals: result.totalJournals,
      totalFlags: flags.length,
    },
    comparison: {
      yourBooks: {
        source: sourceToHumanLabel(result.source),
        issuesFound: flags.length,
        byPhase: phaseMap,
      },
      hellobooks: {
        positioning: 'HelloBooks AI Bookkeeping Module resolves each of these phases with bulk-action and AI-narrated rationale.',
        phaseCoverage: PHASE_COVERAGE,
        exclusiveAdvantages: EXCLUSIVE_ADVANTAGES,
      },
    },
    flags,
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: `Found ${flags.length} issue${flags.length === 1 ? '' : 's'} in your ${sourceToHumanLabel(result.source)} books. HelloBooks's paid product fixes them in bulk and migrates your books in one click.`,
    },
  };
}

interface PhaseInfo {
  count: number;
  hellobooksPhase: string;
  resolutionLabel: string;
}

function buildPhaseMap(flags: DetectionFlag[]): Record<string, PhaseInfo> {
  const out: Record<string, PhaseInfo> = {};
  for (const f of flags) {
    if (!out[f.category]) {
      out[f.category] = { count: 0, ...HB_PHASE_BY_CATEGORY[f.category] };
    }
    out[f.category].count++;
  }
  return out;
}

const HB_PHASE_BY_CATEGORY: Record<string, Omit<PhaseInfo, 'count'>> = {
  IMBALANCE: { hellobooksPhase: 'Phase 1 Cleanup', resolutionLabel: 'Bulk-adjust unbalanced JVs via the Cleanup Command Center.' },
  DUPLICATE: { hellobooksPhase: 'Phase 2 Cleanup Actions', resolutionLabel: 'Bulk-merge duplicate journals via semantic-similarity grouping.' },
  ROUND_NUMBER: { hellobooksPhase: 'Phase 3.0 Anomaly Detection', resolutionLabel: 'Per-anomaly AI-narrated rationale, dismissible.' },
  SCHEMA: { hellobooksPhase: 'Phase 1 Cleanup Detection', resolutionLabel: 'Per-row schema fix-it-now actions.' },
  VARIANCE: { hellobooksPhase: 'Phase 3.1 Variance Flagging', resolutionLabel: 'Conversational acknowledge ("acknowledge the Travel jump").' },
};

const PHASE_COVERAGE = [
  'Phase 1 — Cleanup Detection (9 categories)',
  'Phase 2 — Cleanup Actions & Workflows',
  'Phase 3.0 — Anomaly Detection (7 types, AI-narrated)',
  'Phase 3.1 — Variance Flagging',
  'Phase 3.2 — Missing Recurring Detection',
  'Phase 3.3 — Balance Monitoring (22+ BS lines)',
  'Phase 3.4 — Accrual Suggestions + auto-post',
  'Phase 3.5 — Intercompany Reconciliation',
];

const EXCLUSIVE_ADVANTAGES = [
  'Command-center dashboard across all 9 cleanup categories',
  'Conversational interface — bulk-acknowledge via natural language',
  'One-prompt JE posting (no manual debit/credit forms)',
  'Cross-phase orchestration',
  'Auto ID resolution (no UUIDs in chat)',
];
