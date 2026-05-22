/**
 * Detection over a parsed Balance Sheet.
 *
 * Three checks ship in this PR:
 *   1. bs.equation_broken — Assets != Liabilities + Equity. This is
 *      the fundamental accounting equation; every Balance Sheet MUST
 *      satisfy it.
 *   2. bs.negative_cash_or_ar — current-asset line items (Cash, AR,
 *      Inventory) with negative balances suggest reconciliation
 *      errors or unclassified opening balances.
 *   3. bs.negative_equity — Total Equity is negative — insolvency
 *      signal worth surfacing.
 *
 * Pure functions. No I/O.
 */

import type { DetectionFlag, DetectionSeverity } from './types.js';
import type { ParseResult as BsParseResult } from '../parsers/balanceSheet.js';

const PENNY = 0.01;

/* ─────────────────── 1. Accounting equation ──────────────────── */

export function detectBsEquationBroken(parsed: BsParseResult): DetectionFlag[] {
  if (parsed.equationBalances === null || parsed.equationBalances === true) return [];
  const { totalAssets, totalLiabilities, totalEquity } = parsed.totals;
  if (totalAssets === null || totalLiabilities === null || totalEquity === null) return [];
  const sum = totalLiabilities + totalEquity;
  const diff = totalAssets - sum;
  const larger = Math.max(Math.abs(totalAssets), Math.abs(sum));
  const ratio = larger === 0 ? 1 : Math.abs(diff) / larger;
  let severity: DetectionSeverity = 'low';
  if (ratio >= 0.05) severity = 'high';
  else if (ratio >= 0.005) severity = 'medium';
  return [{
    category: 'IMBALANCE',
    code: 'bs.equation_broken',
    severity,
    message: `Balance Sheet does not balance: Assets ${totalAssets.toFixed(2)} ≠ Liabilities ${totalLiabilities.toFixed(2)} + Equity ${totalEquity.toFixed(2)} (= ${sum.toFixed(2)}, diff ${diff.toFixed(2)}). The fundamental accounting equation is broken — every downstream metric (current ratio, debt-to-equity, working capital) is invalid until this is fixed.`,
    affectedRowIndices: [],
    affectedJournalIds: [],
    data: { totalAssets, totalLiabilities, totalEquity, sum, diff, ratio },
    fixableInHellobooks: true,
  }];
}

/* ─────────────────── 2. Negative current-asset lines ─────────── */

const NEGATIVE_ASSET_RE = /\b(cash|bank|checking|savings|account.* receivable|accounts.* receivable|ar\b|inventory|prepaid)/i;

export function detectBsNegativeCashOrAr(parsed: BsParseResult): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const row of parsed.rows) {
    if (row.kind !== 'LINE_ITEM' || row.amount === null) continue;
    if (row.topSection !== 'ASSETS') continue;
    if (!NEGATIVE_ASSET_RE.test(row.label)) continue;
    if (row.amount >= 0) continue;
    const abs = Math.abs(row.amount);
    flags.push({
      category: 'SCHEMA',
      code: 'bs.negative_asset',
      severity: classifySeverityByAbsAmount(abs),
      message: `Asset line "${row.label}" has a negative balance (${row.amount.toFixed(2)}). Cash / AR / Inventory should not normally be negative; this usually signals a reconciliation error or unclassified opening balance.`,
      affectedRowIndices: [row.rowIndex],
      affectedJournalIds: [],
      data: { line: row.label, subSection: row.subSection, amount: row.amount },
      fixableInHellobooks: true,
    });
  }
  return flags;
}

function classifySeverityByAbsAmount(abs: number): DetectionSeverity {
  if (abs >= 100_000) return 'high';
  if (abs >= 10_000) return 'medium';
  return 'low';
}

/* ─────────────────── 3. Negative equity ─────────────────────── */

export function detectBsNegativeEquity(parsed: BsParseResult): DetectionFlag[] {
  const eq = parsed.totals.totalEquity;
  if (eq === null || eq >= -PENNY) return [];
  return [{
    category: 'SCHEMA',
    code: 'bs.negative_equity',
    severity: 'high',
    message: `Total Equity is negative (${eq.toFixed(2)}). When liabilities exceed assets the company is technically insolvent — this is worth flagging even if temporary. Common causes: accumulated losses exceeding paid-in capital, or large dividends/distributions vs retained earnings.`,
    affectedRowIndices: [],
    affectedJournalIds: [],
    data: { totalEquity: eq, totalAssets: parsed.totals.totalAssets, totalLiabilities: parsed.totals.totalLiabilities },
    fixableInHellobooks: false,
  }];
}
