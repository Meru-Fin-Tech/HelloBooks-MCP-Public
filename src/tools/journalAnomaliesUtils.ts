import { parseCsv } from '../lib/parsers/csv.js';
import {
  detectRoundNumber,
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
}

interface JournalAnomaliesConfig<TJournal, TParsed extends JournalParseResult<TJournal>> {
  tool: AnalysisTool;
  defaultSourceLabel: string;
  migrateSlug: string;
  emptyCsvMessage: string;
  parse: (input: { columns: string[]; rows: Record<string, unknown>[] }) => TParsed;
  normalize: (journal: TJournal) => NormalizedJournal;
}

export function analyzeJournalAnomalies<TJournal, TParsed extends JournalParseResult<TJournal>>(
  args: AnalyzeJournalArgs,
  config: JournalAnomaliesConfig<TJournal, TParsed>,
) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });

  if (columns.length === 0) {
    return emptyCsvError(config.emptyCsvMessage);
  }

  const parsed = config.parse({ columns, rows });
  const normalised = parsed.journals.map(config.normalize);

  const flags: DetectionFlag[] = detectRoundNumber(normalised);

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
    notice: 'This is a Tier-0 subset (round-number detection only). HelloBooks Phase 3.0 anomaly detection in the paid product additionally catches GL outliers vs entity history, vendor-history mismatches, archived-vendor activity, and AI-narrated suspicious lines — none of which can run on pasted-only data.',
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: branding(
      `https://hellobooks.ai/migrate/${config.migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      'Free analysis. Sign up at hellobooks.ai for full Phase 3.0 anomaly detection with AI-narrated rationale and history-aware checks.',
    ),
  };
}
