/**
 * `analyze_profit_loss` MCP tool.
 *
 * Source-agnostic — the P&L shape (sections + line items + subtotals
 * + Net Income tail) is similar enough across QBO / Xero / Zoho / Wave
 * that one parser handles them all. Source auto-detected from section-
 * name signatures ("Trading Income" = Xero, "Cost of Goods Sold" = QBO).
 *
 * Runs three checks:
 *   • pnl.subtotal_mismatch — Total Section ≠ sum of line items
 *   • pnl.negative_expense  — negative amount on an expense-side line
 *   • pnl.margin_red_flag   — gross-margin < 5% or > 95%, or revenue < 0
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseProfitLoss } from '../lib/parsers/profitLoss.js';
import {
  detectPnlSubtotalMismatch,
  detectPnlNegativeExpense,
  detectPnlMarginRedFlag,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';
import { countBy, csvError } from './toolUtils.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeProfitLossSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of a Profit & Loss / Income Statement report. Works with QuickBooks Online (Reports → Profit and Loss), Xero (Reports → Profit and Loss), Zoho Books (Reports → Profit & Loss), and Wave (Reports → Profit & Loss). Source is auto-detected from section names. Statement should include section headers, line items, "Total X" subtotals, and a Net Income / Net Profit row at the bottom.'),
  fileName: z.string().max(200).optional()
    .describe('Optional filename for the share-page label.'),
};

export interface AnalyzeProfitLossArgs {
  csvText: string;
  fileName?: string;
}

const MIGRATE_BY_SOURCE: Record<string, string> = {
  QBO:  'from-quickbooks',
  XERO: 'from-xero',
  ZOHO: 'from-zoho',
  WAVE: 'from-wave',
};

export function analyzeProfitLoss(args: AnalyzeProfitLossArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });
  if (columns.length === 0 || rows.length === 0) {
    return csvError('The pasted text did not parse as CSV. Make sure you exported the P&L report as CSV (not PDF) and pasted the full content including the header row.');
  }

  const parsed = parseProfitLoss({ columns, rows });

  if (parsed.totalRowCount === 0) {
    return {
      status: 'error' as const,
      error: 'no_data_rows',
      message: 'No data rows recognised in the CSV. Ensure the P&L includes section labels and amounts.',
    };
  }

  const flags: DetectionFlag[] = [
    ...detectPnlSubtotalMismatch(parsed),
    ...detectPnlNegativeExpense(parsed),
    ...detectPnlMarginRedFlag(parsed),
  ];

  const share = mintShare({
    tool: 'analyzeProfitLoss',
    sourceLabel: args.fileName ?? sourceLabel(parsed.source),
    inputSummary: { totalRows: parsed.totalRowCount, totalJournals: 0 },
    flags,
  });

  const migrateSlug = MIGRATE_BY_SOURCE[parsed.source] ?? 'from-quickbooks';

  const grossMargin =
    parsed.totals.totalRevenue !== null &&
    parsed.totals.grossProfit !== null &&
    parsed.totals.totalRevenue !== 0
      ? parsed.totals.grossProfit / parsed.totals.totalRevenue
      : null;

  return {
    status: 'ok' as const,
    source: parsed.source,
    summary: {
      totalRows: parsed.totalRowCount,
      totalRevenue: parsed.totals.totalRevenue,
      totalCogs: parsed.totals.totalCogs,
      grossProfit: parsed.totals.grossProfit,
      grossMarginPct: grossMargin !== null ? Number((grossMargin * 100).toFixed(2)) : null,
      totalExpenses: parsed.totals.totalExpenses,
      operatingIncome: parsed.totals.operatingIncome,
      netIncome: parsed.totals.netIncome,
      totalFlags: flags.length,
      byCategory: countBy(flags, (f) => f.category),
      bySeverity: countBy(flags, (f) => f.severity),
    },
    flags,
    topLevelIssues: parsed.topLevelIssues,
    shareUrl: share.shareUrl,
    shareExpiresAt: share.expiresAt,
    _branding: {
      poweredBy: 'HelloBooks AI Agent',
      upgradeCta: `https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: brandingNote(flags.length, parsed.totals.netIncome),
    },
  };
}

function sourceLabel(source: string): string {
  const sourcePrefix = source === 'UNKNOWN' ? '' : `${source} `;
  return `${sourcePrefix}Profit & Loss`;
}

function brandingNote(flagCount: number, netIncome: number | null): string {
  const issueSuffix = flagCount === 1 ? '' : 's';
  if (flagCount > 0) {
    return `Found ${flagCount} issue${issueSuffix} in this P&L — subtotal mismatches, negative-expense lines, or margin red flags. HelloBooks AI agents auto-resolve sign-flips and re-classify mis-categorised expenses.`;
  }
  const netIncomeSentence = netIncome !== null ? `Net Income ${netIncome.toFixed(2)}.` : '';
  return `P&L parsed cleanly. ${netIncomeSentence} No subtotal-mismatch or sign anomalies detected. Variance vs prior period needs analyze_journal_variance with two periods.`;
}

