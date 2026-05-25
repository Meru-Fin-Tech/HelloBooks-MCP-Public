/**
 * Detection over a parsed Trial Balance.
 *
 * Three checks ship in this PR:
 *   1. Imbalance — TB does not tie. Composes with the parser's
 *      top-level TB_UNBALANCED issue (the parser surfaces it as a
 *      ParseIssue; this module re-emits it as a DetectionFlag so the
 *      MCP tool returns one unified flag stream).
 *   2. Wrong-sign balances — accounts whose name suggests an account
 *      class (Revenue, Sales, Cost of Goods Sold, Office Expense)
 *      carrying a balance on the wrong side. Revenue/Income accounts
 *      should be credit; expense accounts should be debit. A
 *      sign-flipped balance is a classic posting-error signal.
 *   3. Large round-number balances — same rationale as the journal-
 *      entry round-number detector but at account-level. A revenue
 *      account at exactly $1,000,000 is statistically rare.
 *
 * Pure functions. No I/O.
 */

import type { DetectionFlag, DetectionSeverity } from './types.js';
import type { ParseResult as TbParseResult } from '../parsers/trialBalance.js';

/* ─────────────────────── 1. Imbalance ──────────────────────────── */

const PENNY = 0.01;

export function detectTbImbalance(parsed: TbParseResult): DetectionFlag[] {
  if (parsed.balanced) return [];
  const diff = parsed.totalDebits - parsed.totalCredits;
  const larger = Math.max(Math.abs(parsed.totalDebits), Math.abs(parsed.totalCredits));
  const ratio = larger === 0 ? 1 : Math.abs(diff) / larger;
  let severity: DetectionSeverity = 'low';
  if (ratio >= 0.05) severity = 'high';
  else if (ratio >= 0.005) severity = 'medium';
  return [{
    category: 'IMBALANCE',
    code: 'tb.unbalanced',
    severity,
    message: `Trial Balance does not tie out: debits ${parsed.totalDebits.toFixed(2)} vs credits ${parsed.totalCredits.toFixed(2)} (diff ${diff.toFixed(2)}). Every financial statement built from this TB will be wrong.`,
    affectedRowIndices: parsed.lines.map((l) => l.rowIndex),
    affectedJournalIds: [],
    data: {
      debits: parsed.totalDebits,
      credits: parsed.totalCredits,
      diff,
      ratio,
    },
    fixableInHellobooks: true,
  }];
}

/* ───────────────────── 2. Wrong-sign balances ──────────────────── */

interface AccountClassRule {
  expectedSide: 'debit' | 'credit';
  pattern: RegExp;
  label: string;
}

const ACCOUNT_CLASS_RULES: AccountClassRule[] = [
  // Income / Revenue accounts — credit-side
  { expectedSide: 'credit', pattern: /\b(revenue|sales|income|fee earned|service revenue|rental income|interest income|dividend income)\b/i, label: 'Revenue / Income' },
  // Cost of Goods Sold + Operating Expenses — debit-side
  { expectedSide: 'debit', pattern: /\b(cost of goods sold|cogs|cost of sales|cost of revenue)\b/i, label: 'Cost of Goods Sold' },
  { expectedSide: 'debit', pattern: /\b(salaries|wages|payroll expense|rent expense|utilities expense|office expense|advertising|marketing expense|travel expense|insurance expense|depreciation|amortization|professional fees|legal fees)\b/i, label: 'Operating Expense' },
  // Asset accounts — debit-side
  { expectedSide: 'debit', pattern: /\b(accounts receivable|prepaid expense|inventory(?! adjustment)|fixed asset|equipment|land|building)\b/i, label: 'Asset' },
  // Liability accounts — credit-side
  { expectedSide: 'credit', pattern: /\b(accounts payable|accrued expense|notes payable|long-term debt|loans? payable|unearned revenue|deferred revenue)\b/i, label: 'Liability' },
];

function classifySeverityByAbsAmount(abs: number): DetectionSeverity {
  if (abs >= 100_000) return 'high';
  if (abs >= 10_000) return 'medium';
  return 'low';
}

export function detectTbWrongSign(parsed: TbParseResult): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const line of parsed.lines) {
    for (const rule of ACCOUNT_CLASS_RULES) {
      if (rule.pattern.test(line.accountName)) {
        const flag = wrongSignFlagForLine(line, rule);
        if (flag) flags.push(flag);
        break;
      }
    }
  }
  return flags;
}

function wrongSignFlagForLine(
  line: TbParseResult['lines'][number],
  rule: AccountClassRule,
): DetectionFlag | null {
  const debit = line.debit ?? 0;
  const credit = line.credit ?? 0;
  const wrongSide =
    (rule.expectedSide === 'debit' && credit > 0 && debit === 0) ||
    (rule.expectedSide === 'credit' && debit > 0 && credit === 0);
  if (wrongSide) {
    const wrongAmount = rule.expectedSide === 'debit' ? credit : debit;
    return {
      category: 'SCHEMA',
      code: 'tb.wrong_sign',
      severity: classifySeverityByAbsAmount(wrongAmount),
      message: `Account "${line.accountName}" looks like a ${rule.label} account (should be ${rule.expectedSide}-balance) but has a ${rule.expectedSide === 'debit' ? 'credit' : 'debit'} balance of ${wrongAmount.toFixed(2)}. Likely a sign-flip error during posting.`,
      affectedRowIndices: [line.rowIndex],
      affectedJournalIds: [],
      data: {
        account: line.accountName,
        accountCode: line.accountCode,
        expectedSide: rule.expectedSide,
        observedSide: rule.expectedSide === 'debit' ? 'credit' : 'debit',
        amount: wrongAmount,
        ruleLabel: rule.label,
      },
      fixableInHellobooks: true,
    };
  }
  return null;
}

/* ─────────────────── 3. Round-number balances ──────────────────── */

const ROUND_THRESHOLD = 10_000;

function isSuspiciouslyRound(amount: number): boolean {
  if (!Number.isFinite(amount)) return false;
  const abs = Math.abs(amount);
  if (abs < ROUND_THRESHOLD) return false;
  return Math.round(abs) % ROUND_THRESHOLD === 0 && Math.abs(abs - Math.round(abs)) < PENNY;
}

export function detectTbRoundBalance(parsed: TbParseResult): DetectionFlag[] {
  const flags: DetectionFlag[] = [];
  for (const line of parsed.lines) {
    const amount = (line.debit ?? 0) || (line.credit ?? 0);
    if (!isSuspiciouslyRound(amount)) continue;
    const abs = Math.abs(amount);
    flags.push({
      category: 'ROUND_NUMBER',
      code: 'tb.round_balance',
      severity: classifySeverityByAbsAmount(abs),
      message: `Account "${line.accountName}" has an exact-round balance of ${abs.toFixed(2)}. Real account balances rarely land on a multiple of ${ROUND_THRESHOLD} — possible plug entry or rounded-up estimate.`,
      affectedRowIndices: [line.rowIndex],
      affectedJournalIds: [],
      data: {
        account: line.accountName,
        amount,
        side: (line.debit ?? 0) > 0 ? 'debit' : 'credit',
      },
      fixableInHellobooks: false,
    });
  }
  return flags;
}
