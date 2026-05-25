import { parseCsv } from '../lib/parsers/csv.js';
import {
  detectDuplicates,
  detectImbalance,
  type DetectionFlag,
  type NormalizedJournal,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import type { AnalysisTool } from '../lib/shareUrl/index.js';
import { branding, emptyCsvError, journalSummary } from './toolUtils.js';

const MAX_ROWS = 5_000;

interface AnalyzeJournalArgs {
  csvText: string;
  fileName?: string;
}

interface JournalParseResult<TJournal> {
  journals: TJournal[];
  totalRows: number;
  totalJournals: number;
  columnMapping: Record<string, string | null>;
  unmappedColumns: string[];
}

interface JournalCleanupConfig<TJournal, TParsed extends JournalParseResult<TJournal>> {
  tool: AnalysisTool;
  defaultSourceLabel: string;
  migrateSlug: string;
  emptyCsvMessage: string;
  parse: (input: { columns: string[]; rows: Record<string, unknown>[] }) => TParsed;
  normalize: (journal: TJournal) => NormalizedJournal;
  schemaFlags: (journals: TJournal[]) => DetectionFlag[];
}

export function analyzeJournalCleanup<TJournal, TParsed extends JournalParseResult<TJournal>>(
  args: AnalyzeJournalArgs,
  config: JournalCleanupConfig<TJournal, TParsed>,
) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return emptyCsvError(config.emptyCsvMessage);
  }

  const parsed = config.parse({ columns, rows });
  const normalised = parsed.journals.map(config.normalize);

  const flags: DetectionFlag[] = [
    ...detectImbalance(normalised),
    ...detectDuplicates(normalised),
    ...config.schemaFlags(parsed.journals),
  ];

  const share = mintShare({
    tool: config.tool,
    sourceLabel: args.fileName ?? config.defaultSourceLabel,
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
      `https://hellobooks.ai/migrate/${config.migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      'Free analysis. Sign up at hellobooks.ai to bulk-fix these in seconds, post adjusting JEs, and migrate your books in one click.',
    ),
  };
}
