/**
 * Balance Sheet parser — source-agnostic.
 *
 * Statement-level. Three top-level sections: Assets, Liabilities,
 * Equity. The fundamental accounting equation must hold:
 *     Total Assets = Total Liabilities + Total Equity
 *
 * QBO + Xero + Zoho + Wave all ship Balance Sheets with similar
 * structure. Section names vary slightly ("Shareholders' Equity" vs
 * "Owner's Equity", "Current Liabilities" sub-sections) but the math
 * structure is universal.
 *
 * Parser walks rows, classifies each as section-header / line-item /
 * subtotal / key-subtotal, and extracts the three key totals
 * (totalAssets, totalLiabilities, totalEquity).
 *
 * Detection inputs the parsed shape and checks:
 *   • Fundamental accounting equation: A = L + E
 *   • Negative cash or AR (likely posting / reconciliation error)
 *   • Negative equity (insolvency signal)
 *   • Round-number plug entries (multiples of 10K)
 *
 * Pure functions. No I/O.
 */

import { parseDecimal, normalizeHeader } from './fieldUtils.js';

export type BsRowKind =
  | 'SECTION_HEADER'
  | 'LINE_ITEM'
  | 'SUBTOTAL'
  | 'KEY_SUBTOTAL';

export type BsSection = 'ASSETS' | 'LIABILITIES' | 'EQUITY' | 'UNKNOWN';

export type BsSource = 'QBO' | 'XERO' | 'ZOHO' | 'WAVE' | 'UNKNOWN';
type BsColumnRole = 'Label' | 'Amount';

export type IssueCode =
  | 'INVALID_DECIMAL'
  | 'NO_DATA_ROWS'
  | 'BS_ASSETS_MISSING'
  | 'BS_LIABILITIES_OR_EQUITY_MISSING'
  | 'BS_EQUATION_BROKEN';

export interface ParseIssue {
  code: IssueCode;
  message: string;
  field?: string;
  rowIndex?: number;
}

export interface BsRow {
  rowIndex: number;
  label: string;
  amount: number | null;
  kind: BsRowKind;
  /** Top-level section this row belongs to. */
  topSection: BsSection;
  /** Sub-section name (e.g. "Current Assets" under ASSETS). */
  subSection: string | null;
  indent: number;
}

export interface ParseInput {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ParseResult {
  source: BsSource;
  entityType: 'BALANCE_SHEET';
  rows: BsRow[];
  totals: {
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    totalLiabilitiesAndEquity: number | null;
  };
  /** True iff Assets = Liabilities + Equity within a 1c tolerance. */
  equationBalances: boolean | null;
  totalRowCount: number;
  totalIssues: number;
  columnMapping: Record<string, BsColumnRole | null>;
  topLevelIssues: ParseIssue[];
}

interface BsParseState {
  rows: BsRow[];
  currentTopSection: BsSection;
  currentSubSection: string | null;
}

/* ──────────────────────── Column detection ─────────────────────── */

const LABEL_ALIASES = new Set(['account', 'item', 'description', 'name', '']);
const AMOUNT_ALIASES = ['amount', 'balance', 'total', 'current period', 'this period', 'ytd', 'as of'];

function classifyColumn(header: string): BsColumnRole | null {
  const n = normalizeHeader(header);
  if (LABEL_ALIASES.has(n)) return 'Label';
  if (AMOUNT_ALIASES.some((a) => n === a || n.startsWith(a))) return 'Amount';
  if (/\d{4}/.test(n)) return 'Amount';
  return null;
}

function buildColumnMapping(columns: string[]): Record<string, BsColumnRole | null> {
  const mapping: Record<string, BsColumnRole | null> = {};
  for (const c of columns) mapping[c] = classifyColumn(c);
  const hasLabel = Object.values(mapping).includes('Label');
  if (!hasLabel && columns.length > 0) mapping[columns[0]] = 'Label';
  const hasAmount = Object.values(mapping).includes('Amount');
  if (!hasAmount && columns.length > 1) mapping[columns.at(-1)!] = 'Amount';
  return mapping;
}

/* ──────────────────────── Row classification ───────────────────── */

const ASSETS_TOP_RE = /^(assets|total assets|current assets|fixed assets|non[- ]current assets)/i;
const LIABILITIES_TOP_RE = /^(liabilities|total liabilities|current liabilities|long[- ]term liabilities|non[- ]current liabilities)/i;
const EQUITY_TOP_RE = /^(equity|total equity|stockholders[' ]+equity|shareholders[' ]+equity|owner[' ]+s equity|retained earnings)/i;
const LIABILITIES_AND_EQUITY_RE = /^total liabilit(y|ies) (and|plus) equity$/i;

const TOTAL_ASSETS_RE = /^total assets$/i;
const TOTAL_LIABILITIES_RE = /^total liabilit(y|ies)$/i;
const TOTAL_EQUITY_RE = /^total (stockholders|shareholders|owner|owner[' ]s)?[' ]*equity$/i;
const TOTAL_PREFIX_RE = /^total\s+/i;

function deriveIndent(raw: string): number {
  let i = 0;
  for (; i < raw.length; i++) {
    const c = raw[i];
    if (c !== ' ' && c !== '\t') break;
  }
  return i;
}

function topSectionFromLabel(label: string, current: BsSection): BsSection {
  // A header row that switches sections wins.
  if (LIABILITIES_AND_EQUITY_RE.test(label)) return current; // sub-total at the bottom
  if (ASSETS_TOP_RE.test(label) || /^assets$/i.test(label)) return 'ASSETS';
  if (LIABILITIES_TOP_RE.test(label) || /^liabilities$/i.test(label)) return 'LIABILITIES';
  if (EQUITY_TOP_RE.test(label) || /^equity$/i.test(label)) return 'EQUITY';
  return current;
}

function isKeySubtotal(label: string): boolean {
  return TOTAL_ASSETS_RE.test(label) || TOTAL_LIABILITIES_RE.test(label) || TOTAL_EQUITY_RE.test(label) || LIABILITIES_AND_EQUITY_RE.test(label);
}

function classifyRow(label: string, amount: number | null, indent: number): BsRowKind {
  if (isKeySubtotal(label)) return 'KEY_SUBTOTAL';
  if (TOTAL_PREFIX_RE.test(label)) return 'SUBTOTAL';
  if (amount === null) return 'SECTION_HEADER';
  if (indent > 0) return 'LINE_ITEM';
  return 'LINE_ITEM';
}

/* ──────────────────────── Source detection ─────────────────────── */

export function detectBsSource(rows: BsRow[]): BsSource {
  const labels = rows.map((r) => r.label.toLowerCase());
  if (labels.some((l) => l.includes("shareholder's funds") || l.includes("shareholders' funds"))) return 'XERO';
  if (labels.some((l) => l.includes('stockholders equity') || l.includes("stockholders' equity"))) return 'QBO';
  return 'UNKNOWN';
}

/* ─────────────────────────── Main parse ────────────────────────── */

const PENNY = 0.01;

export function parseBalanceSheet(input: ParseInput): ParseResult {
  const columnMapping = buildColumnMapping(input.columns);
  const labelCol = Object.entries(columnMapping).find(([, v]) => v === 'Label')?.[0];
  const amountCol = Object.entries(columnMapping).find(([, v]) => v === 'Amount')?.[0];

  const topLevelIssues: ParseIssue[] = [];

  if (!labelCol || !amountCol || input.rows.length === 0) {
    if (input.rows.length === 0) {
      topLevelIssues.push({ code: 'NO_DATA_ROWS', message: 'Balance Sheet CSV has no data rows after the header.' });
    }
    return {
      source: 'UNKNOWN',
      entityType: 'BALANCE_SHEET',
      rows: [],
      totals: nullTotals(),
      equationBalances: null,
      totalRowCount: 0,
      totalIssues: topLevelIssues.length,
      columnMapping,
      topLevelIssues,
    };
  }

  const state: BsParseState = {
    rows: [],
    currentTopSection: 'UNKNOWN',
    currentSubSection: null,
  };

  input.rows.forEach((raw, idx) => {
    processBsRow(state, raw, idx + 1, labelCol, amountCol);
  });

  const totals = detectKeyTotals(state.rows);

  let equationBalances: boolean | null = null;
  if (totals.totalAssets !== null && totals.totalLiabilities !== null && totals.totalEquity !== null) {
    const sum = totals.totalLiabilities + totals.totalEquity;
    equationBalances = Math.abs(totals.totalAssets - sum) < PENNY;
    if (!equationBalances) {
      topLevelIssues.push({
        code: 'BS_EQUATION_BROKEN',
        message: `Balance Sheet does not balance: Assets ${totals.totalAssets.toFixed(2)} != Liabilities ${totals.totalLiabilities.toFixed(2)} + Equity ${totals.totalEquity.toFixed(2)} = ${sum.toFixed(2)} (diff ${(totals.totalAssets - sum).toFixed(2)}). The fundamental accounting equation is broken.`,
      });
    }
  }

  if (totals.totalAssets === null) {
    topLevelIssues.push({ code: 'BS_ASSETS_MISSING', message: 'Could not find a Total Assets row in the Balance Sheet.' });
  }
  if (totals.totalLiabilities === null || totals.totalEquity === null) {
    topLevelIssues.push({ code: 'BS_LIABILITIES_OR_EQUITY_MISSING', message: 'Could not find a Total Liabilities or Total Equity row in the Balance Sheet — cannot validate the accounting equation.' });
  }

  return {
    source: detectBsSource(state.rows),
    entityType: 'BALANCE_SHEET',
    rows: state.rows,
    totals,
    equationBalances,
    totalRowCount: state.rows.length,
    totalIssues: topLevelIssues.length,
    columnMapping,
    topLevelIssues,
  };
}

function processBsRow(
  state: BsParseState,
  raw: Record<string, unknown>,
  rowIndex: number,
  labelCol: string,
  amountCol: string,
): void {
  const rawLabel = String(raw[labelCol] ?? '');
  const labelStripped = rawLabel.trim();
  if (labelStripped === '') return;

  const amount = parseBsAmount(raw[amountCol]);
  const indent = deriveIndent(rawLabel);
  const newTop = topSectionFromLabel(labelStripped, state.currentTopSection);
  if (newTop !== state.currentTopSection) {
    state.currentTopSection = newTop;
    state.currentSubSection = null;
  }

  const kind = classifyRow(labelStripped, amount, indent);
  if (kind === 'SECTION_HEADER') state.currentSubSection = labelStripped;

  state.rows.push({
    rowIndex,
    label: labelStripped,
    amount,
    kind,
    topSection: state.currentTopSection,
    subSection: kind === 'SECTION_HEADER' ? null : state.currentSubSection,
    indent,
  });
}

function parseBsAmount(rawAmount: unknown): number | null {
  if (rawAmount === undefined || rawAmount === null || String(rawAmount).trim() === '') return null;
  return parseDecimal(rawAmount);
}

function nullTotals(): ParseResult['totals'] {
  return {
    totalAssets: null,
    totalLiabilities: null,
    totalEquity: null,
    totalLiabilitiesAndEquity: null,
  };
}

function detectKeyTotals(rows: BsRow[]): ParseResult['totals'] {
  const out = nullTotals();
  for (const row of rows) {
    if (row.amount === null) continue;
    if (out.totalAssets === null && TOTAL_ASSETS_RE.test(row.label)) out.totalAssets = row.amount;
    if (out.totalLiabilities === null && TOTAL_LIABILITIES_RE.test(row.label)) out.totalLiabilities = row.amount;
    if (out.totalEquity === null && TOTAL_EQUITY_RE.test(row.label)) out.totalEquity = row.amount;
    if (out.totalLiabilitiesAndEquity === null && LIABILITIES_AND_EQUITY_RE.test(row.label)) out.totalLiabilitiesAndEquity = row.amount;
  }
  return out;
}
