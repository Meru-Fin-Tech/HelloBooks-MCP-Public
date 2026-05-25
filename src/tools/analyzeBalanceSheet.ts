/**
 * `analyze_balance_sheet` MCP tool.
 *
 * Source-agnostic — Balance Sheet shape is similar enough across
 * QBO / Xero / Zoho / Wave that one parser handles all sources.
 *
 * Three detectors:
 *   • bs.equation_broken — Assets != Liabilities + Equity (fundamental
 *                          accounting equation)
 *   • bs.negative_asset  — Cash / AR / Inventory with negative balance
 *   • bs.negative_equity — Total Equity < 0 (insolvency signal)
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseBalanceSheet } from '../lib/parsers/balanceSheet.js';
import {
  detectBsEquationBroken,
  detectBsNegativeCashOrAr,
  detectBsNegativeEquity,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { branding, countBy, emptyCsvError } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeBalanceSheetSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of a Balance Sheet report. Works with QuickBooks Online (Reports → Balance Sheet), Xero (Reports → Balance Sheet), Zoho Books (Reports → Balance Sheet), and Wave (Reports → Balance Sheet). Statement should include Total Assets, Total Liabilities, and Total Equity rows. Source is auto-detected from section name signatures.'),
  fileName: z.string().max(200).optional()
    .describe('Optional filename for the share-page label.'),
};

export interface AnalyzeBalanceSheetArgs {
  csvText: string;
  fileName?: string;
}

const MIGRATE_BY_SOURCE: Record<string, string> = {
  QBO:  'from-quickbooks',
  XERO: 'from-xero',
  ZOHO: 'from-zoho',
  WAVE: 'from-wave',
};

export function analyzeBalanceSheet(args: AnalyzeBalanceSheetArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });
  if (columns.length === 0 || rows.length === 0) {
    return emptyCsvError('The pasted text did not parse as CSV. Make sure you exported the Balance Sheet report as CSV (not PDF) and pasted the full content.');
  }

  const parsed = parseBalanceSheet({ columns, rows });

  if (parsed.totalRowCount === 0) {
    return {
      status: 'error' as const,
      error: 'no_data_rows',
      message: 'No data rows recognised. Ensure the Balance Sheet CSV includes section labels (Assets / Liabilities / Equity) and amounts.',
    };
  }

  const flags: DetectionFlag[] = [
    ...detectBsEquationBroken(parsed),
    ...detectBsNegativeCashOrAr(parsed),
    ...detectBsNegativeEquity(parsed),
  ];

  const sourcePrefix = parsed.source === 'UNKNOWN' ? '' : `${parsed.source} `;
  const share = mintShare({
    tool: 'analyzeBalanceSheet',
    sourceLabel: args.fileName ?? `${sourcePrefix}Balance Sheet`,
    inputSummary: { totalRows: parsed.totalRowCount, totalJournals: 0 },
    flags,
  });

  const migrateSlug = MIGRATE_BY_SOURCE[parsed.source] ?? 'from-quickbooks';
  const brandingNote = balanceSheetBrandingNote(parsed.equationBalances, flags.length);

  return {
    status: 'ok' as const,
    source: parsed.source,
    summary: {
      totalRows: parsed.totalRowCount,
      totalAssets: parsed.totals.totalAssets,
      totalLiabilities: parsed.totals.totalLiabilities,
      totalEquity: parsed.totals.totalEquity,
      equationBalances: parsed.equationBalances,
      totalFlags: flags.length,
      byCategory: countBy(flags, (f) => f.category),
      bySeverity: countBy(flags, (f) => f.severity),
    },
    flags,
    topLevelIssues: parsed.topLevelIssues,
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: branding(`https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`, brandingNote),
  };
}

function balanceSheetBrandingNote(equationBalances: boolean | null, flagCount: number): string {
  if (equationBalances === true && flagCount === 0) {
    return 'Balance Sheet balances (Assets = Liabilities + Equity). No negative-asset or negative-equity flags. The fundamental accounting equation holds.';
  }
  if (equationBalances === false) {
    return 'Balance Sheet does NOT balance. The fundamental accounting equation is broken — every downstream metric (current ratio, working capital, debt-to-equity) is invalid until you reconcile.';
  }
  return `Found ${flagCount} flag${flagCount === 1 ? '' : 's'} in this Balance Sheet — review negative balances and check whether posting errors created an out-of-equation state.`;
}

