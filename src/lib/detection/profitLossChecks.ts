/**
 * Detection over a parsed Profit & Loss statement.
 *
 * Three checks ship in this PR:
 *   1. pnl.subtotal_mismatch — a "Total Section" subtotal does not equal
 *      the sum of its preceding line items in the same section.
 *   2. pnl.negative_expense — an expense-side line item carries a
 *      negative amount (likely a sign-flip or refund posted as
 *      negative-expense instead of contra-income).
 *   3. pnl.margin_red_flag  — Gross Profit Margin < 5% or > 95% when
 *      Revenue + Gross Profit are both present. Either signals data
 *      problem or extreme business position worth review.
 *
 * Pure functions. No I/O.
 */

import type { DetectionFlag, DetectionSeverity } from './types.js';
import type { ParseResult as PnlParseResult, PnlRow } from '../parsers/profitLoss.js';

const PENNY = 0.01;

/* ─────────────────── 1. Subtotal math mismatches ──────────────────── */

export function detectPnlSubtotalMismatch(parsed: PnlParseResult): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  // Walk the rows and accumulate line items between section header /
  // previous subtotal and the next subtotal — then compare.
  let pending: PnlRow[] = [];
  for (const row of parsed.rows) {
    if (row.kind === 'LINE_ITEM' && row.amount !== null) {
      pending.push(row);
      continue;
    }
    if (row.kind === 'SUBTOTAL' && row.amount !== null) {
      const sum = pending.reduce((s, r) => s + (r.amount ?? 0), 0);
      const diff = row.amount - sum;
      if (Math.abs(diff) > PENNY && pending.length > 0) {
        flags.push({
          category: 'IMBALANCE',
          code: 'pnl.subtotal_mismatch',
          severity: severityForRatio(Math.abs(diff), Math.max(Math.abs(row.amount), Math.abs(sum))),
          message: `${row.label} = ${row.amount.toFixed(2)} but its line items sum to ${sum.toFixed(2)} (diff ${diff.toFixed(2)}). Subtotal math does not tie — a line item may be missing or duplicated.`,
          affectedRowIndices: [...pending.map((p) => p.rowIndex), row.rowIndex],
          affectedJournalIds: [],
          data: {
            section: row.label,
            subtotal: row.amount,
            lineItemSum: sum,
            diff,
            lineItemCount: pending.length,
          },
          fixableInHellobooks: true,
        });
      }
      pending = [];
      continue;
    }
    // SECTION_HEADER + KEY_SUBTOTAL reset the accumulator without
    // emitting a flag — key subtotals (Gross Profit, Net Income) span
    // multiple sections and have their own math (handled in margin checks).
    if (row.kind === 'SECTION_HEADER' || row.kind === 'KEY_SUBTOTAL') {
      pending = [];
    }
  }
  return flags;
}

function severityForRatio(absDiff: number, scale: number): DetectionSeverity {
  if (scale === 0) return 'low';
  const ratio = absDiff / scale;
  if (ratio >= 0.05) return 'high';
  if (ratio >= 0.005) return 'medium';
  return 'low';
}

/* ─────────────────── 2. Negative-expense flags ──────────────────── */

const EXPENSE_SECTION_RE = /\b(expense|cost|operating|overhead|admin|payroll|salary|wages|rent|utilit|advertis|marketing|travel)/i;

export function detectPnlNegativeExpense(parsed: PnlParseResult): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const row of parsed.rows) {
    if (row.kind !== 'LINE_ITEM' || row.amount === null) continue;
    if (row.amount >= 0) continue;
    // Section name suggests expense-side?
    const section = row.section ?? '';
    if (!EXPENSE_SECTION_RE.test(section) && !EXPENSE_SECTION_RE.test(row.label)) continue;
    const abs = Math.abs(row.amount);
    flags.push({
      category: 'SCHEMA',
      code: 'pnl.negative_expense',
      severity: severityForAbsAmount(abs),
      message: `Expense line "${row.label}" in section "${section || '(uncategorised)'}" is negative (${row.amount.toFixed(2)}). Expenses are typically positive; a negative usually means a refund or reversal posted to the wrong side.`,
      affectedRowIndices: [row.rowIndex],
      affectedJournalIds: [],
      data: {
        line: row.label,
        section,
        amount: row.amount,
      },
      fixableInHellobooks: true,
    });
  }
  return flags;
}

function severityForAbsAmount(abs: number): DetectionSeverity {
  if (abs >= 100_000) return 'high';
  if (abs >= 10_000) return 'medium';
  return 'low';
}

/* ─────────────────── 3. Margin red flags ──────────────────── */

export function detectPnlMarginRedFlag(parsed: PnlParseResult): DetectionFlag[] {
  const { totalRevenue, grossProfit, netIncome } = parsed.totals;
  const flags: DetectionFlag[] = [];

  // Gross-profit margin sanity — outside 5%-95% band is unusual enough
  // to warrant manual review.
  if (totalRevenue !== null && grossProfit !== null && totalRevenue !== 0) {
    const gpMargin = grossProfit / totalRevenue;
    if (gpMargin < 0.05 && totalRevenue > 0) {
      flags.push({
        category: 'SCHEMA',
        code: 'pnl.margin_low',
        severity: 'medium',
        message: `Gross Profit Margin is ${(gpMargin * 100).toFixed(1)}% (${grossProfit.toFixed(2)} on revenue ${totalRevenue.toFixed(2)}). Under 5% is unusually low — review COGS allocation or check whether non-COGS expenses landed in the wrong section.`,
        affectedRowIndices: [],
        affectedJournalIds: [],
        data: { totalRevenue, grossProfit, gpMargin },
        fixableInHellobooks: false,
      });
    }
    if (gpMargin > 0.95 && totalRevenue > 0) {
      flags.push({
        category: 'SCHEMA',
        code: 'pnl.margin_high',
        severity: 'medium',
        message: `Gross Profit Margin is ${(gpMargin * 100).toFixed(1)}% (${grossProfit.toFixed(2)} on revenue ${totalRevenue.toFixed(2)}). Over 95% is unusually high — likely indicates COGS was not posted, or service-revenue mis-classified as product revenue.`,
        affectedRowIndices: [],
        affectedJournalIds: [],
        data: { totalRevenue, grossProfit, gpMargin },
        fixableInHellobooks: false,
      });
    }
  }

  // Negative-revenue or near-zero-revenue with non-zero net income —
  // suggests revenue posted on wrong side, or contra-revenue not netted.
  if (totalRevenue !== null && totalRevenue < 0) {
    flags.push({
      category: 'SCHEMA',
      code: 'pnl.negative_revenue',
      severity: 'high',
      message: `Total Revenue is negative (${totalRevenue.toFixed(2)}). Revenue is a credit-balance account by convention; a negative total Revenue usually means revenue was posted on the wrong side or contra-revenue exceeded gross revenue.`,
      affectedRowIndices: [],
      affectedJournalIds: [],
      data: { totalRevenue, netIncome },
      fixableInHellobooks: true,
    });
  }

  return flags;
}
