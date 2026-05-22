/**
 * `analyze_trial_balance` MCP tool.
 *
 * Source-agnostic — the Trial Balance shape is similar enough across
 * QBO / Xero / Zoho / Wave that one parser + one tool handles them all,
 * with source auto-detected from headers (YTD columns = Xero, Opening
 * Balance columns = Zoho, etc.).
 *
 * Runs three checks:
 *   • tb.unbalanced     — sum debits ≠ sum credits (every downstream
 *                          financial statement is invalid until fixed)
 *   • tb.wrong_sign     — account class name suggests credit-side but
 *                          balance is debit-side (or vice versa)
 *   • tb.round_balance  — exact-multiple-of-10K balance (plug signal)
 *
 * Funnel CTA routes to the source-specific /migrate/from-<source> page
 * when source is detected; defaults to /migrate when unknown.
 */

import { z } from 'zod';

import { parseCsv } from '../lib/parsers/csv.js';
import { parseTrialBalance } from '../lib/parsers/trialBalance.js';
import {
  detectTbImbalance,
  detectTbWrongSign,
  detectTbRoundBalance,
  type DetectionFlag,
} from '../lib/detection/index.js';
import { mintShare } from '../lib/shareUrl/index.js';

const MAX_ROWS = 5_000;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const analyzeTrialBalanceSchema = {
  csvText: z.string()
    .min(1, 'csvText is required')
    .max(MAX_CSV_BYTES, `csvText exceeds the ${MAX_CSV_BYTES}-byte limit.`)
    .describe('Raw CSV text of a Trial Balance report. Works with QuickBooks Online (Reports → Trial Balance), Xero (Reports → Trial Balance), Zoho Books (Reports → Accountant → Trial Balance), and Wave (Reports → Trial Balance). Source is auto-detected from column headers.'),
  fileName: z.string().max(200).optional()
    .describe('Optional filename for the share-page label.'),
};

export interface AnalyzeTrialBalanceArgs {
  csvText: string;
  fileName?: string;
}

const MIGRATE_BY_SOURCE: Record<string, string> = {
  QBO:  'from-quickbooks',
  XERO: 'from-xero',
  ZOHO: 'from-zoho',
  WAVE: 'from-wave',
};

export function analyzeTrialBalance(args: AnalyzeTrialBalanceArgs) {
  const { columns, rows } = parseCsv(args.csvText, { maxRows: MAX_ROWS });
  if (columns.length === 0) {
    return {
      status: 'error' as const,
      error: 'empty_or_invalid_csv',
      message: 'The pasted text did not parse as CSV. Make sure you exported the Trial Balance report as CSV (not PDF) and pasted the full content including the header row.',
    };
  }

  const parsed = parseTrialBalance({ columns, rows });

  // Find the Debit + Credit headers and require both to be present —
  // a Trial Balance without those columns is malformed.
  const hasDebit = Object.values(parsed.columnMapping).includes('Debit');
  const hasCredit = Object.values(parsed.columnMapping).includes('Credit');
  if (!hasDebit || !hasCredit) {
    return {
      status: 'error' as const,
      error: 'not_a_trial_balance',
      message: `The CSV does not look like a Trial Balance — expected Debit and Credit columns. Mapped columns: ${Object.entries(parsed.columnMapping).filter(([, v]) => v).map(([k, v]) => `${k}→${v}`).join(', ')}. Try exporting Reports → Trial Balance from your accounting platform.`,
    };
  }

  const flags: DetectionFlag[] = [
    ...detectTbImbalance(parsed),
    ...detectTbWrongSign(parsed),
    ...detectTbRoundBalance(parsed),
  ];

  const share = mintShare({
    tool: 'analyzeTrialBalance',
    sourceLabel: args.fileName ?? `${parsed.source === 'UNKNOWN' ? '' : parsed.source + ' '}Trial Balance`,
    inputSummary: { totalRows: parsed.totalRows, totalJournals: 0 },
    flags,
  });

  const migrateSlug = MIGRATE_BY_SOURCE[parsed.source] ?? 'from-quickbooks';
  return {
    status: 'ok' as const,
    source: parsed.source,
    summary: {
      totalAccounts: parsed.totalRows,
      totalDebits: parsed.totalDebits,
      totalCredits: parsed.totalCredits,
      balanced: parsed.balanced,
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
      upgradeCta: `https://hellobooks.ai/migrate/${migrateSlug}?ref=${encodeURIComponent(share.shareUrl)}`,
      signupUrl: 'https://hellobooks.ai/signup',
      note: parsed.balanced
        ? `Trial Balance ties (debits ${parsed.totalDebits.toFixed(2)} = credits ${parsed.totalCredits.toFixed(2)}). Found ${flags.length} other issue${flags.length === 1 ? '' : 's'} — wrong-sign balances or round-number plugs. HelloBooks AI agents auto-resolve these at account level.`
        : `Trial Balance does NOT tie out — debits ${parsed.totalDebits.toFixed(2)} vs credits ${parsed.totalCredits.toFixed(2)}. Every downstream report (P&L, BS, cash flow) built from this TB is wrong. Fix the imbalance before relying on any financial statement.`,
    },
  };
}

function countBy<T>(arr: T[], keyFn: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of arr) {
    const k = keyFn(item);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
